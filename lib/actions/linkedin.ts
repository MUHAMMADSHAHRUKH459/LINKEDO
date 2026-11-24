'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { decrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/linkedin/callback`;

export async function getLinkedInAuthUrl() {
  return { url: '/api/auth/linkedin' };
}

export async function checkLinkedInConnection() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { connected: false };

  const serviceClient = createServiceRoleClient();
  const { data } = await serviceClient
    .from('integration_secrets')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'linkedin')
    .single();

  return { connected: !!data };
}

export async function publishPostToLinkedIn(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // 1. Fetch the post content
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single();

  if (postError || !post) throw new Error('Post not found');

  // 2. Fetch the LinkedIn access token
  const serviceClient = createServiceRoleClient();
  const { data: secret, error: secretError } = await serviceClient
    .from('integration_secrets')
    .select('encrypted_access_token')
    .eq('user_id', user.id)
    .eq('provider', 'linkedin')
    .single();

  if (secretError || !secret) {
    throw new Error('LinkedIn account not connected. Please connect it in Settings.');
  }

  let tokens;
  try {
    tokens = JSON.parse(decrypt(secret.encrypted_access_token));
  } catch (e) {
    throw new Error('Failed to decrypt LinkedIn tokens. Please reconnect your account.');
  }

  const accessToken = tokens.access_token;

  // 3. Get LinkedIn Member ID (URN)
  const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch LinkedIn profile info. Your session might have expired.');
  }

  const userInfo = await userResponse.json();
  const personUrn = `urn:li:person:${userInfo.sub}`;

  // 4. Publish to LinkedIn
  // We use the Community Management API / v2 / posts
  const publishResponse = await fetch('https://api.linkedin.com/v2/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202401', // Using a recent version
    },
    body: JSON.stringify({
      author: personUrn,
      commentary: post.content,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    }),
  });

  if (!publishResponse.ok) {
    let errorDetail = '';
    try {
      const errorJson = await publishResponse.json();
      errorDetail = errorJson.message || JSON.stringify(errorJson);
    } catch {
      errorDetail = await publishResponse.text();
    }
    console.error('LinkedIn Publish Error:', errorDetail);
    throw new Error(`LinkedIn publishing failed: ${errorDetail}`);
  }

  // Get LinkedIn Post ID from header or body
  const linkedinPostId = publishResponse.headers.get('x-restli-id') ||
                          publishResponse.headers.get('location')?.split('/').pop() ||
                          'published';

  // 5. Update Post Status in Database
  const { error: updateError } = await supabase
    .from('posts')
    .update({
      status: 'Published',
      published_at: new Date().toISOString(),
      linkedin_post_id: linkedinPostId,
    })
    .eq('id', postId)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Failed to update post status in DB:', updateError.message);
  }

  // 6. Log Activity
  await serviceClient.from('activity_logs').insert({
    user_id: user.id,
    action_type: 'LinkedIn Publish',
    description: `Published post: ${post.title}`,
    metadata: { linkedin_post_id: linkedinPostId, post_id: postId }
  });

  revalidatePath('/content-studio');
  revalidatePath('/calendar');
  revalidatePath('/overview');

  return { success: true, linkedinPostId };
}
