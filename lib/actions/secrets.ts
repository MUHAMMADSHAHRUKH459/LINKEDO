'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { encrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';

export async function saveIntegrationSecret(formData: FormData) {
  const apiKey = formData.get('apiKey') as string;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const encryptedKey = encrypt(apiKey);
  const serviceClient = createServiceRoleClient();

  const { error } = await serviceClient
    .from('integration_secrets')
    .upsert({
      user_id: user.id,
      provider: 'openrouter',
      encrypted_access_token: encryptedKey,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id, provider'
    });

  if (error) throw new Error(error.message);

  revalidatePath('/settings');
}
