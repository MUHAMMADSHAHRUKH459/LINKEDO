'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { decrypt } from '@/lib/encryption';

export async function generatePostContent(topic: string, tone: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Retrieve and decrypt API key
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
