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
    const { data, error } = await supabase
      .from('posts')
      .update({
        title,
        content,
        status,
        scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', user.id)
      .select('id')
      .single();

    if (error) throw new Error(`Update failed: ${error.message}`);
    return data.id;
  } else {
    // Create new post
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        title,
        content,
        status,
        scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Insert failed: ${error.message}`);
    return data.id;
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
