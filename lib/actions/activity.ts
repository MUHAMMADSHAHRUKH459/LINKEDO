'use server';

import { createClient } from '@/lib/supabase/server';

export async function getRecentActivity() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action_type, description, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching activity logs:', error.message);
    return [];
  }

  return (data || []).map((log) => ({
    id: log.id,
    type: 'post', // Simplified categorization
    title: log.description,
    time: new Date(log.created_at).toLocaleDateString(),
    status: 'Completed',
    likes: 0,
    comments: 0,
  }));
}
