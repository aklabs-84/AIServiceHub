import type { SupabaseClient } from '@supabase/supabase-js';
import type { OneTimeAccessRow } from '@/types/database';

export async function getAll(client: SupabaseClient): Promise<OneTimeAccessRow[]> {
  const { data, error } = await client
    .from('one_time_access')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as OneTimeAccessRow[];
}

export async function getById(client: SupabaseClient, id: string): Promise<OneTimeAccessRow | null> {
  const { data, error } = await client
    .from('one_time_access')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as OneTimeAccessRow;
}

export async function getByUsername(client: SupabaseClient, username: string): Promise<OneTimeAccessRow | null> {
  const { data, error } = await client
    .from('one_time_access')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) return null;
  return data as OneTimeAccessRow;
}

export async function getBySessionToken(client: SupabaseClient, token: string): Promise<OneTimeAccessRow | null> {
  const { data, error } = await client
    .from('one_time_access')
    .select('*')
    .eq('session_token', token)
    .single();

  if (error || !data) return null;
  return data as OneTimeAccessRow;
}

export async function create(
  client: SupabaseClient,
  username: string,
  passwordHash: string,
  durationHours: number
): Promise<string> {
  const { data, error } = await client
    .from('one_time_access')
    .insert({
      username,
      password_hash: passwordHash,
      duration_hours: durationHours,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateSession(
  client: SupabaseClient,
  id: string,
  sessionToken: string,
  expiresAt: string
): Promise<void> {
  const { error } = await client
    .from('one_time_access')
    .update({
      session_token: sessionToken,
      session_expires_at: expiresAt,
      used_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function remove(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('one_time_access').delete().eq('id', id);
  if (error) throw error;
}
