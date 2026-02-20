import type { SupabaseClient } from '@supabase/supabase-js';
import type { Prompt, PromptRow, CreatePromptInput, UpdatePromptInput, Attachment } from '@/types/database';
import { mapAttachmentFromDB } from './attachments';

function mapPromptFromDB(data: PromptRow): Prompt {
  const likes = data.prompt_likes?.map((l) => l.user_id) || [];

  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    promptContent: data.prompt_content || '',
    snsUrls: data.sns_urls || [],
    category: data.category || '',
    isPublic: data.is_public ?? true,
    thumbnailUrl: data.thumbnail_url || undefined,
    thumbnailPositionX: data.thumbnail_pos?.x,
    thumbnailPositionY: data.thumbnail_pos?.y,
    attachments: [], // populated separately via attachAttachments
    createdBy: data.created_by || '',
    createdByName: data.created_by_name || 'Anonymous',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    likes,
    likeCount: data.like_count ?? likes.length,
    tags: data.tags || [],
  };
}

const PROMPT_SELECT = '*, prompt_likes(user_id)';

async function attachAttachments(client: SupabaseClient, prompts: Prompt[]): Promise<Prompt[]> {
  if (prompts.length === 0) return prompts;
  const ids = prompts.map((p) => p.id);
  const { data: attachments } = await client
    .from('attachments')
    .select('*')
    .eq('target_type', 'prompt')
    .in('target_id', ids);

  if (!attachments) return prompts;
  const map = new Map<string, Attachment[]>();
  for (const att of attachments) {
    const list = map.get(att.target_id) || [];
    list.push(mapAttachmentFromDB(att));
    map.set(att.target_id, list);
  }
  return prompts.map((p) => ({ ...p, attachments: map.get(p.id) || [] }));
}

export async function getAll(client: SupabaseClient): Promise<Prompt[]> {
  const { data, error } = await client
    .from('prompts')
    .select(PROMPT_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const prompts = (data as PromptRow[]).map(mapPromptFromDB);
  return attachAttachments(client, prompts);
}

export async function getById(client: SupabaseClient, id: string): Promise<Prompt | null> {
  const { data, error } = await client
    .from('prompts')
    .select(PROMPT_SELECT)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  const prompt = mapPromptFromDB(data as PromptRow);
  const result = await attachAttachments(client, [prompt]);
  return result[0];
}

export async function getByCategory(client: SupabaseClient, category: string): Promise<Prompt[]> {
  const { data, error } = await client
    .from('prompts')
    .select(PROMPT_SELECT)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const prompts = (data as PromptRow[]).map(mapPromptFromDB);
  return attachAttachments(client, prompts);
}

export async function getByTag(client: SupabaseClient, tag: string): Promise<Prompt[]> {
  const { data, error } = await client
    .from('prompts')
    .select(PROMPT_SELECT)
    .contains('tags', [tag])
    .order('created_at', { ascending: false });

  if (error) throw error;
  const prompts = (data as PromptRow[]).map(mapPromptFromDB);
  return attachAttachments(client, prompts);
}

export async function getByUser(client: SupabaseClient, userId: string): Promise<Prompt[]> {
  const { data, error } = await client
    .from('prompts')
    .select(PROMPT_SELECT)
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const prompts = (data as PromptRow[]).map(mapPromptFromDB);
  return attachAttachments(client, prompts);
}

export async function getLikedByUser(client: SupabaseClient, userId: string): Promise<Prompt[]> {
  const { data, error } = await client
    .from('prompt_likes')
    .select(`prompt:prompts(${PROMPT_SELECT})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const prompts = (data as unknown as { prompt: PromptRow }[])
    .map((item) => item.prompt)
    .filter(Boolean)
    .map(mapPromptFromDB)
    .filter((p) => p.isPublic || p.createdBy === userId);
  return attachAttachments(client, prompts);
}

export async function create(
  client: SupabaseClient,
  input: CreatePromptInput,
  userId: string,
  options?: { signal?: AbortSignal }
): Promise<string> {
  const payload = {
    name: input.name,
    description: input.description,
    prompt_content: input.promptContent,
    sns_urls: input.snsUrls,
    category: input.category,
    is_public: input.isPublic ?? true,
    thumbnail_url: input.thumbnailUrl,
    thumbnail_pos: input.thumbnailPositionX != null
      ? { x: input.thumbnailPositionX, y: input.thumbnailPositionY }
      : null,
    tags: input.tags || [],
    created_by: userId,
    created_by_name: input.createdByName,
  };

  const query = client
    .from('prompts')
    .insert(payload)
    .select('id');

  if (options?.signal) {
    query.abortSignal(options.signal);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('데이터가 저장되지 않았습니다 (No ID returned)');
  }

  return data[0].id;
}

export async function update(client: SupabaseClient, input: UpdatePromptInput): Promise<void> {
  const { id, ...fields } = input;
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (fields.name !== undefined) payload.name = fields.name;
  if (fields.description !== undefined) payload.description = fields.description;
  if (fields.promptContent !== undefined) payload.prompt_content = fields.promptContent;
  if (fields.snsUrls !== undefined) payload.sns_urls = fields.snsUrls;
  if (fields.category !== undefined) payload.category = fields.category;
  if (fields.isPublic !== undefined) payload.is_public = fields.isPublic;
  if (fields.thumbnailUrl !== undefined) payload.thumbnail_url = fields.thumbnailUrl;
  if (fields.tags !== undefined) payload.tags = fields.tags;
  if (fields.thumbnailPositionX !== undefined || fields.thumbnailPositionY !== undefined) {
    payload.thumbnail_pos = { x: fields.thumbnailPositionX, y: fields.thumbnailPositionY };
  }

  const { error } = await client.from('prompts').update(payload).eq('id', id);
  if (error) throw error;
}

export async function remove(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('prompts').delete().eq('id', id);
  if (error) throw error;
}

export async function like(client: SupabaseClient, promptId: string, userId: string): Promise<void> {
  const { error } = await client
    .from('prompt_likes')
    .insert({ prompt_id: promptId, user_id: userId });

  if (error && error.code !== '23505') throw error;
}

export async function unlike(client: SupabaseClient, promptId: string, userId: string): Promise<void> {
  const { error } = await client
    .from('prompt_likes')
    .delete()
    .match({ prompt_id: promptId, user_id: userId });

  if (error) throw error;
}
