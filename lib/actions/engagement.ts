'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { decrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';

export async function getComments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comments:', error.message);
    return [];
  }

  return data || [];
}

export async function generateCommentReply(commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Retrieve comment details
  const { data: comment, error: commentError } = await supabase
    .from('comments')
    .select('*')
    .eq('id', commentId)
    .eq('user_id', user.id)
    .single();

  if (commentError || !comment) {
    throw new Error('Comment not found');
  }

  // Fetch encrypted OpenRouter API key using service role client
  const serviceClient = createServiceRoleClient();
  const { data: secretData, error: secretError } = await serviceClient
    .from('integration_secrets')
    .select('encrypted_access_token')
    .eq('user_id', user.id)
    .eq('provider', 'openrouter')
    .single();

  if (secretError || !secretData) {
    throw new Error('OpenRouter API key not found');
  }

  // Decrypt API key
  const apiKey = decrypt(secretData.encrypted_access_token);

  // Call OpenRouter API for comment reply generation
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
        content: `You are an AI assistant specialized in writing thoughtful, professional responses to LinkedIn comments. Generate concise, helpful, and engaging replies.`
      }, {
        role: 'user',
        content: `Write a thoughtful reply to this LinkedIn comment:

Comment: "${comment.comment_text}"
Post Title: "${comment.post_title}"
Commenter's Name: "${comment.author}" (${comment.author_role})

The reply should be:
- Professional and authentic
- 2-4 sentences long
- Include a relevant insight or offer value
- End with an open-ended question or call to action`,
      }]
    })
  });

  if (!response.ok) throw new Error('AI generation failed');
  const result = await response.json();
  return result.choices[0].message.content;
}

export async function updateCommentStatus(commentId: string, newStatus: 'Pending' | 'Approved & Sent' | 'Dismissed') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('comments')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) throw new Error(`Update failed: ${error.message}`);
  revalidatePath('/engagement');
}