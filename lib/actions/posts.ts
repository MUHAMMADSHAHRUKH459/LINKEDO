'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { decrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';

export async function getPosts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error.message);
    return [];
  }

  return data || [];
}

export async function savePost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const status = formData.get('status') as string;
  const scheduled_at = formData.get('scheduled_at') as string;

  // Check if editing or creating
  const postId = formData.get('id') as string;

  if (postId) {
    // Update existing post
    const { error } = await supabase
      .from('posts')
      .update({
        title,
        content,
        status,
        scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', user.id);

    if (error) throw new Error(`Update failed: ${error.message}`);
  } else {
    // Create new post
    const { error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        title,
        content,
        status,
        scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
      });

    if (error) throw new Error(`Insert failed: ${error.message}`);
  }

  revalidatePath('/calendar');
  revalidatePath('/content-studio');
}

export async function deletePost(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(`Delete failed: ${error.message}`);

  revalidatePath('/content-studio');
  revalidatePath('/calendar');
}

export async function generatePostContent(topic: string, tone: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Retrieve and decrypt API key using service role client
  const serviceClient = createServiceRoleClient();
  const { data: secret, error: secretError } = await serviceClient
    .from('integration_secrets')
    .select('encrypted_access_token')
    .eq('user_id', user.id)
    .eq('provider', 'openrouter')
    .single();

  if (secretError || !secret) {
    throw new Error('Please configure your OpenRouter API key in settings.');
  }

  const apiKey = decrypt(secret.encrypted_access_token);

  // AI Generation logic using OpenRouter API
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL!,
      'X-Title': 'LinkedIn AI Studio',
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [
        { role: 'system', content: `You are an expert LinkedIn content strategist. Write in a ${tone} tone.` },
        { role: 'user', content: `Write a compelling, high-engagement LinkedIn post about: ${topic}. Include hashtags and hook.` }
      ],
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    // Attempt to parse OpenRouter error
    let errorDetail = 'Unknown error';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.error?.message || JSON.stringify(errorJson);
    } catch {
      errorDetail = await response.text();
    }

    // Log diagnostic information server-side only
    console.error(`OpenRouter API Failure [Status: ${response.status} ${response.statusText}]: ${errorDetail}`);

    // Return safe, useful message to the frontend
    throw new Error(`AI generation failed: ${response.status === 401 ? 'Invalid API Key' : 'Service unavailable or quota exceeded'}. Check your settings.`);
  }

  const data = await response.json();
  console.log(`OpenRouter Used Model: ${data.model}`); // Safe: logs model ID only
  return data.choices[0].message.content;
}

export async function getDashboardStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { total: 0, published: 0, drafts: 0 };

  const { data: posts, error } = await supabase
    .from('posts')
    .select('status')
    .eq('user_id', user.id);

  if (error) return { total: 0, published: 0, drafts: 0 };

  return {
    total: posts.length,
    published: posts.filter(p => p.status === 'Published').length,
    drafts: posts.filter(p => p.status === 'Draft').length,
  };
}
