'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { decrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';

type CommentStatus = 'Pending' | 'Publishing' | 'Approved & Sent' | 'Dismissed';

type LinkedInTokens = {
  access_token: string;
};

type LinkedInComment = {
  commentUrn?: string;
  urn?: string;
  entityUrn?: string;
  id?: string | number | null;
  message?: string | { text?: string };
};

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { supabase, user };
}

async function getLinkedInAccessToken(userId: string): Promise<string> {
  const serviceClient = createServiceRoleClient();
  const { data: secret, error } = await serviceClient
    .from('integration_secrets')
    .select('encrypted_access_token')
    .eq('user_id', userId)
    .eq('provider', 'linkedin')
    .maybeSingle();

  if (error || !secret) {
    throw new Error('LinkedIn account is not connected. Connect it in Settings.');
  }

  try {
    const tokens = JSON.parse(decrypt(secret.encrypted_access_token)) as LinkedInTokens;
    if (!tokens.access_token) throw new Error('Missing access token');
    return tokens.access_token;
  } catch {
    throw new Error('LinkedIn credentials could not be read. Reconnect your account in Settings.');
  }
}

async function getCommentRows(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Could not load comments: ${error.message}`);
  return data || [];
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return payload.message || payload.error?.message || `LinkedIn returned HTTP ${response.status}.`;
  } catch {
    return `LinkedIn returned HTTP ${response.status}.`;
  }
}

function getCommentUrn(comment: LinkedInComment, postUrn: string): string | null {
  const existingUrn = comment.commentUrn || comment.urn || comment.entityUrn;
  if (typeof existingUrn === 'string' && existingUrn.startsWith('urn:li:comment:')) {
    return existingUrn;
  }

  if (comment.id === undefined || comment.id === null) return null;
  if (typeof comment.id === 'string' && comment.id.startsWith('urn:li:comment:')) {
    return comment.id;
  }
  return `urn:li:comment:(${postUrn},${comment.id})`;
}

export async function getComments() {
  const { supabase, user } = await getAuthenticatedUser();
  return getCommentRows(supabase, user.id);
}

export async function refreshLinkedInComments(): Promise<{
  permissionAvailable: boolean | null;
  message: string | null;
  syncedCount: number;
}> {
  const { supabase, user } = await getAuthenticatedUser();
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, title, linkedin_post_id')
    .eq('user_id', user.id)
    .eq('status', 'Published')
    .not('linkedin_post_id', 'is', null)
    .order('published_at', { ascending: false })
    .limit(25);

  if (postsError) throw new Error(`Could not load your published posts: ${postsError.message}`);
  if (!posts?.length) {
    return {
      permissionAvailable: null,
      message: 'No LinkedIn-published posts are linked to this account yet. You can still paste a comment below to draft a reply.',
      syncedCount: 0,
    };
  }

  let accessToken: string;
  try {
    accessToken = await getLinkedInAccessToken(user.id);
  } catch (error) {
    return {
      permissionAvailable: false,
      message: error instanceof Error ? error.message : 'LinkedIn account is not connected.',
      syncedCount: 0,
    };
  }

  const commentRows: Array<Record<string, unknown>> = [];
  let validPostCount = 0;

  for (const post of posts) {
    const postUrn = post.linkedin_post_id;
    if (!postUrn || !/^urn:li:(share|ugcPost|activity):/.test(postUrn)) continue;
    validPostCount += 1;

    const url = new URL(
      `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/comments`,
    );
    url.searchParams.set('q', 'comments');
    url.searchParams.set('start', '0');
    url.searchParams.set('count', '100');

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202601',
        },
        cache: 'no-store',
      });
    } catch {
      return {
        permissionAvailable: null,
        message: 'Could not reach LinkedIn to load comments. Please try again.',
        syncedCount: 0,
      };
    }

    if (!response.ok) {
      const detail = await readApiError(response);
      if (response.status === 401) {
        return {
          permissionAvailable: false,
          message: 'LinkedIn authorization expired or is missing. Reconnect LinkedIn in Settings and try again.',
          syncedCount: 0,
        };
      }
      if (response.status === 403) {
        return {
          permissionAvailable: false,
          message: `LinkedIn denied comment access. The app needs the r_member_social_feed permission enabled and approved, then reconnect LinkedIn. ${detail}`,
          syncedCount: 0,
        };
      }
      return {
        permissionAvailable: null,
        message: `Could not load comments from LinkedIn: ${detail}`,
        syncedCount: 0,
      };
    }

    let payload: { elements?: LinkedInComment[] };
    try {
      payload = await response.json();
    } catch {
      return {
        permissionAvailable: null,
        message: 'LinkedIn returned an unreadable comments response.',
        syncedCount: 0,
      };
    }

    for (const comment of payload.elements || []) {
      const commentText = typeof comment.message === 'string'
        ? comment.message
        : comment.message?.text;
      const commentUrn = getCommentUrn(comment, postUrn);
      if (typeof commentText !== 'string' || !commentText.trim() || !commentUrn) continue;

      commentRows.push({
        user_id: user.id,
        post_id: post.id,
        post_user_id: user.id,
        author: 'LinkedIn member',
        author_role: 'Commenter',
        post_title: post.title,
        comment_text: commentText,
        ai_reply: '',
        status: 'Pending',
        linkedin_post_urn: postUrn,
        linkedin_comment_urn: commentUrn,
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (!validPostCount) {
    return {
      permissionAvailable: null,
      message: 'No supported LinkedIn post URNs were found. Re-publish a post from Content Studio before syncing its comments.',
      syncedCount: 0,
    };
  }

  if (commentRows.length) {
    const { error } = await supabase
      .from('comments')
      .upsert(commentRows, {
        onConflict: 'user_id,linkedin_comment_urn',
        ignoreDuplicates: true,
      });
    if (error) throw new Error(`Could not save comments from LinkedIn: ${error.message}`);
  }

  revalidatePath('/engagement');
  return {
    permissionAvailable: true,
    message: null,
    syncedCount: commentRows.length,
  };
}

export async function generateCommentReply(commentId: string) {
  const { supabase, user } = await getAuthenticatedUser();
  const { data: comment, error: commentError } = await supabase
    .from('comments')
    .select('*')
    .eq('id', commentId)
    .eq('user_id', user.id)
    .single();

  if (commentError || !comment) {
    throw new Error('Comment not found');
  }
  if (comment.status !== 'Pending') throw new Error('Only pending comments can be edited.');

  const reply = await generateReply(comment.comment_text, comment.post_title, comment.author, comment.author_role, user.id);
  const { error } = await supabase
    .from('comments')
    .update({ ai_reply: reply, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('user_id', user.id)
    .eq('status', 'Pending');

  if (error) throw new Error(`Could not save the suggested reply: ${error.message}`);
  revalidatePath('/engagement');
  return reply;
}

export async function generateManualCommentReply(commentText: string, postTitle = '') {
  const { user } = await getAuthenticatedUser();
  if (typeof commentText !== 'string' || !commentText.trim()) {
    throw new Error('Paste a comment before generating a reply.');
  }
  if (commentText.length > 5000) throw new Error('Comments must be 5,000 characters or fewer.');
  if (typeof postTitle !== 'string' || postTitle.length > 500) {
    throw new Error('Post context must be 500 characters or fewer.');
  }
  return generateReply(commentText.trim(), postTitle.trim(), 'LinkedIn member', 'Manual comment', user.id);
}

async function generateReply(
  commentText: string,
  postTitle: string,
  author: string,
  authorRole: string,
  userId: string,
): Promise<string> {
  const serviceClient = createServiceRoleClient();
  const { data: secretData, error: secretError } = await serviceClient
    .from('integration_secrets')
    .select('encrypted_access_token')
    .eq('user_id', userId)
    .eq('provider', 'openrouter')
    .single();

  if (secretError || !secretData) {
    throw new Error('OpenRouter API key not found. Configure it in Settings before generating replies.');
  }

  const apiKey = decrypt(secretData.encrypted_access_token);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL!,
      'X-Title': 'LinkedIn AI Studio',
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [{
        role: 'system',
        content: 'You write thoughtful, professional LinkedIn comment replies. Never claim personal experience or invent facts. Keep replies concise and natural.'
      }, {
        role: 'user',
        content: `Draft a professional, authentic reply to the comment below. Keep it to 2-4 sentences and make it relevant to the post. Do not force a question or call to action.

Comment: "${commentText}"
Post title: "${postTitle || 'Not provided'}"
Commenter: "${author}" (${authorRole})`,
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`AI reply generation failed (HTTP ${response.status}). Check the OpenRouter API key and quota in Settings.`);
  }
  const result = await response.json();
  const reply = result.choices?.[0]?.message?.content;
  if (typeof reply !== 'string' || !reply.trim()) {
    throw new Error('OpenRouter returned an empty reply. Please try generating again.');
  }
  return reply.trim();
}

export async function updateCommentStatus(commentId: string, newStatus: 'Dismissed') {
  const { supabase, user } = await getAuthenticatedUser();
  const { error } = await supabase
    .from('comments')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('user_id', user.id)
    .eq('status', 'Pending');

  if (error) throw new Error(`Update failed: ${error.message}`);
  revalidatePath('/engagement');
}

export async function publishCommentReply(commentId: string, replyText: string) {
  const { supabase, user } = await getAuthenticatedUser();
  if (typeof replyText !== 'string') throw new Error('Enter a reply before publishing.');
  const reply = replyText.trim();
  if (!reply) throw new Error('Enter a reply before publishing.');
  if (reply.length > 3000) throw new Error('Replies must be 3,000 characters or fewer.');

  const { data: comment, error: commentError } = await supabase
    .from('comments')
    .select('id, status, linkedin_post_urn, linkedin_comment_urn')
    .eq('id', commentId)
    .eq('user_id', user.id)
    .single();
  if (commentError || !comment) throw new Error('Comment not found.');
  if (comment.status !== 'Pending') throw new Error('This comment is already being processed or has been completed.');
  if (!comment.linkedin_post_urn || !comment.linkedin_comment_urn) {
    throw new Error('This comment has no LinkedIn comment reference and cannot be published. Sync comments from LinkedIn first.');
  }

  const accessToken = await getLinkedInAccessToken(user.id);
  const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!profileResponse.ok) {
    if (profileResponse.status === 401) {
      throw new Error('LinkedIn authorization expired. Reconnect LinkedIn in Settings before publishing.');
    }
    throw new Error(`Could not verify the LinkedIn account before publishing (HTTP ${profileResponse.status}).`);
  }
  const profile = await profileResponse.json();
  if (typeof profile.sub !== 'string' || !profile.sub) {
    throw new Error('LinkedIn did not return a member ID. Reconnect the LinkedIn account and try again.');
  }

  const { data: claimedComment, error: claimError } = await supabase
    .from('comments')
    .update({
      status: 'Publishing' satisfies CommentStatus,
      ai_reply: reply,
      publish_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .eq('user_id', user.id)
    .eq('status', 'Pending')
    .select('id')
    .maybeSingle();

  if (claimError) throw new Error(`Could not reserve this comment for publishing: ${claimError.message}`);
  if (!claimedComment) throw new Error('This comment is already being published or has already been processed.');

  const endpoint = `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(comment.linkedin_post_urn)}/comments`;
  let publishResponse: Response;
  try {
    publishResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202601',
      },
      body: JSON.stringify({
        actor: `urn:li:person:${profile.sub}`,
        message: { text: reply },
        parent: comment.linkedin_comment_urn,
      }),
      cache: 'no-store',
    });
  } catch {
    const { error: uncertaintyError } = await supabase
      .from('comments')
      .update({
        publish_error: 'The LinkedIn request outcome is unknown. Verify the reply on LinkedIn before attempting any retry.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .eq('status', 'Publishing');
    if (uncertaintyError) console.error('Could not save LinkedIn publishing uncertainty:', uncertaintyError.message);
    throw new Error('Could not confirm LinkedIn’s response. The comment is locked to prevent a duplicate; verify LinkedIn before retrying.');
  }

  if (!publishResponse.ok) {
    const detail = await readApiError(publishResponse);
    if (publishResponse.status >= 500) {
      const { error: uncertaintyError } = await supabase
        .from('comments')
        .update({
          publish_error: `LinkedIn returned HTTP ${publishResponse.status}; publishing outcome may be unknown.`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('user_id', user.id)
        .eq('status', 'Publishing');
      if (uncertaintyError) console.error('Could not save LinkedIn publishing uncertainty:', uncertaintyError.message);
      throw new Error(`LinkedIn returned HTTP ${publishResponse.status}. The comment is locked to prevent a duplicate; verify LinkedIn before retrying.`);
    }

    const { error: releaseError } = await supabase
      .from('comments')
      .update({
        status: 'Pending',
        publish_error: detail,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .eq('status', 'Publishing');
    if (releaseError) console.error('Could not release failed LinkedIn comment claim:', releaseError.message);

    if (publishResponse.status === 403) {
      throw new Error(`LinkedIn denied comment publishing. The app needs the w_member_social_feed permission enabled and approved, then reconnect LinkedIn. ${detail}`);
    }
    if (publishResponse.status === 401) {
      throw new Error(`LinkedIn authorization expired. Reconnect LinkedIn in Settings. ${detail}`);
    }
    throw new Error(`LinkedIn publishing failed (HTTP ${publishResponse.status}): ${detail}`);
  }

  const linkedinReplyId = publishResponse.headers.get('x-restli-id');
  const { data: completedComment, error: completionError } = await supabase
    .from('comments')
    .update({
      status: 'Approved & Sent',
      linkedin_reply_id: linkedinReplyId,
      publish_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .eq('user_id', user.id)
    .eq('status', 'Publishing')
    .select('id')
    .maybeSingle();

  revalidatePath('/engagement');
  if (completionError || !completedComment) {
    if (completionError) {
      console.error('LinkedIn reply was published but comment state could not be updated:', completionError.message);
    }
    return {
      success: true,
      warning: 'LinkedIn accepted the reply, but its status could not be saved. Do not publish it again.',
    };
  }
  return { success: true, warning: null };
}