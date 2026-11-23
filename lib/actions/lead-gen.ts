'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getTargetCompanies() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('target_companies')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch target companies: ${error.message}`);
  }

  return data || [];
}

export async function addTargetCompany(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const name = formData.get('name') as string;
  const industry = formData.get('industry') as string;
  const website = formData.get('website') as string;

  if (!name) throw new Error('Company name is required');

  const { error } = await supabase
    .from('target_companies')
    .insert({
      user_id: user.id,
      name,
      industry,
      website,
      status: 'Prospect', // Default status
    });

  if (error) throw new Error(`Insert failed: ${error.message}`);

  revalidatePath('/lead-gen');
}

export async function deleteTargetCompany(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('target_companies')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(`Delete failed: ${error.message}`);

  revalidatePath('/lead-gen');
}
