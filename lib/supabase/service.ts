import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function createServiceRoleClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Service-role client must NOT be initialized in client-side code.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or Service Role Key for server-side service client.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
