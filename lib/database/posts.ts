import type { SupabaseClient } from '@supabase/supabase-js';
import type { Post, PostRow, PostTopic, CreatePostInput } from '@/types/database';

function mapPostFromDB(data: PostRow): Post {
  const likes = data.post_likes?.map((l) => l.user_id) || [];
  return {
    id: data.id,
    authorId: data.author_id || '',
    authorName: data.author_name || 'Anonymous',
    authorAvatarUrl: data.author_avatar_url || undefined,
    content: data.content,
    images: data.images || [],
    topic: data.topic || 'chat',
    likes,
    likeCount: data.like_count ?? likes.length,
    commentCount: data.comment_count ?? 0,
    isPublic: data.is_public ?? true,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

const POST_SELECT = '*, post_likes(user_id)';

export async function getAll(client: SupabaseClient): Promise<Post[]> {
  const { data, error } = await client
    .from('posts')
    .select(POST_SELECT)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as PostRow[]).map(mapPostFromDB);
}

export async function create(
  client: SupabaseClient,
  input: CreatePostInput,
  userId: string,
  userName: string,
  avatarUrl?: string
): Promise<string> {
  const { data, error } = await client
    .from('posts')
    .insert({
      content: input.content,
      images: input.images || [],
      topic: input.topic || 'chat',
      is_public: input.isPublic ?? true,
      author_id: userId,
      author_name: userName,
      author_avatar_url: avatarUrl || null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function update(
  client: SupabaseClient,
  id: string,
  content: string,
  topic: PostTopic
): Promise<void> {
  const { error } = await client
    .from('posts')
    .update({ content, topic, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function remove(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('posts').delete().eq('id', id);
  if (error) throw error;
}

export async function like(client: SupabaseClient, postId: string, userId: string): Promise<void> {
  const { error } = await client
    .from('post_likes')
    .insert({ post_id: postId, user_id: userId });

  if (error && error.code !== '23505') throw error;
}

export async function unlike(client: SupabaseClient, postId: string, userId: string): Promise<void> {
  const { error } = await client
    .from('post_likes')
    .delete()
    .match({ post_id: postId, user_id: userId });

  if (error) throw error;
}

export type { PostTopic };
