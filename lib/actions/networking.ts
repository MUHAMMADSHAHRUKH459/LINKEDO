'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { decrypt } from '@/lib/encryption';

export async function getNetworkingProfiles() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch profiles of other users
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .neq('id', user.id) // Exclude self
    .limit(20)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching networking profiles:', error.message);
    return [];
  }

  revalidatePath('/networking');

  // Transform to match UI expectations
  return (data || []).map(profile => ({
    id: profile.id,
    name: profile.full_name || profile.email.split('@')[0],
    role: 'Industry Professional',
    industry: 'Various',
    mutual: 0,
    email: profile.email
  }));
}

export async function generateNetworkingMessage(profileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Fetch encrypted OpenRouter API key using service role client
  const serviceClient = createServiceRoleClient();
  const { data: secretData, error: secretError } = await serviceClient
    .from('integration_secrets')
    .select('encrypted_access_token')
    .eq('user_id', user.id)
    .eq('provider', 'openrouter')
    .single();

  if (secretError || !secretData) throw new Error('OpenRouter API key not found');

  // Decrypt API key
  const apiKey = decrypt(secretData.encrypted_access_token);

  // Fetch target profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', profileId)
    .single();

  if (!profileData) throw new Error('Profile not found');

  // Call OpenRouter API
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
        role: 'user',
        content: `Generate a personalized LinkedIn connection request to ${profileData.full_name}. Keep it professional and concise, suggesting mutual connections or shared interests.`
      }]
    })
  });

  if (!response.ok) throw new Error('AI generation failed');
  const result = await response.json();
  return result.choices[0].message.content;
}

export async function saveConnectionRequest(connectionData: {
  name: string;
  role: string;
  industry: string;
  mutualCount: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('connections')
    .insert({
      user_id: user.id,
      name: connectionData.name,
      role: connectionData.role,
      industry: connectionData.industry,
      mutual_count: connectionData.mutualCount,
      status: 'Requested'
    });

  if (error) throw new Error(error.message);
  revalidatePath('/networking');
  return data;
}

export async function getConnectionHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('connections')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching connection history:', error.message);
    return [];
  }

  return data || [];
}

export async function updateConnectionStatus(connectionId: string, status: 'Suggested' | 'Requested' | 'Connected') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('connections')
    .update({ status })
    .eq('id', connectionId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
  revalidatePath('/networking');
  return data;
}

export async function getConnectionsByStatus(status: 'Suggested' | 'Requested' | 'Connected') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching connections by status:', error.message);
    return [];
  }

  return data || [];
}

export async function getNetworkingStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { total: 0, suggested: 0, requested: 0, connected: 0 };

  // Get total connections count
  const { count: totalCount, error: totalError } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (totalError) {
    console.error('Error fetching total connections:', totalError.message);
  }

  // Get counts by status
  const { data: statusCounts, error: statusError } = await supabase
    .from('connections')
    .select('status')
    .eq('user_id', user.id);

  if (statusError) {
    console.error('Error fetching status counts:', statusError.message);
  }

  const counts = { total: totalCount || 0, suggested: 0, requested: 0, connected: 0 };
  if (statusCounts) {
    statusCounts.forEach((item: any) => {
      if (item.status === 'Suggested') counts.suggested++;
      else if (item.status === 'Requested') counts.requested++;
      else if (item.status === 'Connected') counts.connected++;
    });
  }

  return counts;
}

export async function saveNetworkingSettings(settings: {
  industry?: string;
  keywords?: string[];
  autoConnect?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      linkedin_settings: settings,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select();

  if (error) throw new Error(error.message);
  revalidatePath('/networking');
  return data;
}