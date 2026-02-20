import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, ProfileRow } from '@/types/database';

function mapProfileFromDB(data: ProfileRow): UserProfile {
  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    role: data.role || 'user',
    createdAt: new Date(data.created_at),
  };
}

export async function getAllUsers(client: SupabaseClient): Promise<UserProfile[]> {
  const { data, error } = await client.from('profiles').select('*');
  if (error) throw error;
  return (data as ProfileRow[]).map(mapProfileFromDB);
}

export async function getUserRole(client: SupabaseClient, userId: string): Promise<'user' | 'admin'> {
  const { data, error } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Profile not found, create with default role
      const { data: newData, error: insertError } = await client
        .from('profiles')
        .upsert({ id: userId, role: 'user' })
        .select('role')
        .single();

      if (!insertError && newData) {
        return newData.role as 'user' | 'admin';
      }
    }
    return 'user';
  }

  return (data?.role as 'user' | 'admin') || 'user';
}

export async function ensureUserProfile(
  client: SupabaseClient,
  uid: string,
  email?: string | null,
  displayName?: string | null,
  avatarUrl?: string | null
): Promise<void> {
  const payload: Record<string, unknown> = { id: uid };
  if (email) payload.email = email;
  if (displayName) payload.display_name = displayName;
  if (avatarUrl) payload.avatar_url = avatarUrl;

  const { error } = await client
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('ensureUserProfile error:', error);
  }
}

export async function updateUserRole(
  client: SupabaseClient,
  userId: string,
  role: 'user' | 'admin'
): Promise<void> {
  const { error } = await client
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) throw error;
}
