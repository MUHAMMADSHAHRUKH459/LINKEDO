'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { encrypt, decrypt } from '@/lib/encryption';

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
