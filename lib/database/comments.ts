import type { SupabaseClient } from '@supabase/supabase-js';
import type { Comment, CommentRow, CommentTargetType } from '@/types/database';

function mapCommentFromDB(data: CommentRow): Comment {
  return {
    id: data.id,
    targetId: data.target_id,
    targetType: data.target_type as CommentTargetType,
    content: data.content,
    createdBy: data.created_by || '',
    createdByName: data.created_by_name || 'Anonymous',
    createdAt: new Date(data.created_at),
  };
}

export async function getAll(client: SupabaseClient): Promise<Comment[]> {
  const { data, error } = await client
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as CommentRow[]).map(mapCommentFromDB);
}

export async function getByTarget(
  client: SupabaseClient,
  targetId: string,
  targetType: CommentTargetType
): Promise<Comment[]> {
  const { data, error } = await client
    .from('comments')
    .select('*')
    .eq('target_id', targetId)
    .eq('target_type', targetType)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as CommentRow[]).map(mapCommentFromDB);
}

export async function create(
  client: SupabaseClient,
  targetId: string,
  targetType: CommentTargetType,
  content: string,
  userId: string,
  userName: string
): Promise<string> {
  const { data, error } = await client
    .from('comments')
    .insert({
      target_id: targetId,
      target_type: targetType,
      content,
      created_by: userId,
      created_by_name: userName,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function update(client: SupabaseClient, commentId: string, content: string): Promise<void> {
  const { error } = await client
    .from('comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId);

  if (error) throw error;
}

export async function remove(client: SupabaseClient, commentId: string): Promise<void> {
  const { error } = await client.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}
