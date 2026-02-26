import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIApp, AppRow, CreateAppInput, UpdateAppInput, Attachment } from '@/types/database';
import { mapAttachmentFromDB } from './attachments';

function mapAppFromDB(data: AppRow): AIApp {
  const likes = data.app_likes?.map((l) => l.user_id) || [];

  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    appUrls: data.app_urls || [],
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

const APP_SELECT = '*, app_likes(user_id)';

async function attachAttachments(client: SupabaseClient, apps: AIApp[]): Promise<AIApp[]> {
  if (apps.length === 0) return apps;
  const ids = apps.map((a) => a.id);
  const { data: attachments } = await client
    .from('attachments')
    .select('*')
    .eq('target_type', 'app')
    .in('target_id', ids);

  if (!attachments) return apps;
  const map = new Map<string, Attachment[]>();
  for (const att of attachments) {
    const list = map.get(att.target_id) || [];
    list.push(mapAttachmentFromDB(att));
    map.set(att.target_id, list);
  }
  return apps.map((app) => ({ ...app, attachments: map.get(app.id) || [] }));
}

export async function getAll(client: SupabaseClient): Promise<AIApp[]> {
  const { data, error } = await client
    .from('apps')
    .select(APP_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const apps = (data as AppRow[]).map(mapAppFromDB);
  return attachAttachments(client, apps);
}

export async function getAppsForSelection(client: SupabaseClient): Promise<Pick<AIApp, 'id' | 'name' | 'createdByName' | 'category'>[]> {
  const { data, error } = await client
    .from('apps')
    .select('id, name, created_by_name, category')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as any[]).map(row => ({
    id: row.id,
    name: row.name,
    createdByName: row.created_by_name || 'Anonymous',
    category: row.category || '',
  }));
}

export async function getById(client: SupabaseClient, id: string): Promise<AIApp | null> {
  const { data, error } = await client
    .from('apps')
    .select(APP_SELECT)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  const app = mapAppFromDB(data as AppRow);
  const result = await attachAttachments(client, [app]);
  return result[0];
}

export async function getByCategory(client: SupabaseClient, category: string): Promise<AIApp[]> {
  const { data, error } = await client
    .from('apps')
    .select(APP_SELECT)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const apps = (data as AppRow[]).map(mapAppFromDB);
  return attachAttachments(client, apps);
}

export async function getByTag(client: SupabaseClient, tag: string): Promise<AIApp[]> {
  const { data, error } = await client
    .from('apps')
    .select(APP_SELECT)
    .contains('tags', [tag])
    .order('created_at', { ascending: false });

  if (error) throw error;
  const apps = (data as AppRow[]).map(mapAppFromDB);
  return attachAttachments(client, apps);
}

export async function getByUser(client: SupabaseClient, userId: string): Promise<AIApp[]> {
  const { data, error } = await client
    .from('apps')
    .select(APP_SELECT)
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const apps = (data as AppRow[]).map(mapAppFromDB);
  return attachAttachments(client, apps);
}

export async function getLikedByUser(client: SupabaseClient, userId: string): Promise<AIApp[]> {
  const { data, error } = await client
    .from('app_likes')
    .select(`app:apps(${APP_SELECT})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const apps = (data as unknown as { app: AppRow }[])
    .map((item) => item.app)
    .filter(Boolean)
    .map(mapAppFromDB)
    .filter((app) => app.isPublic || app.createdBy === userId);
  return attachAttachments(client, apps);
}

export async function create(client: SupabaseClient, input: CreateAppInput, userId: string): Promise<string> {
  const payload = {
    name: input.name,
    description: input.description,
    app_urls: input.appUrls,
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

  const { data, error } = await client
    .from('apps')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function update(client: SupabaseClient, input: UpdateAppInput): Promise<void> {
  const { id, ...fields } = input;
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (fields.name !== undefined) payload.name = fields.name;
  if (fields.description !== undefined) payload.description = fields.description;
  if (fields.appUrls !== undefined) payload.app_urls = fields.appUrls;
  if (fields.snsUrls !== undefined) payload.sns_urls = fields.snsUrls;
  if (fields.category !== undefined) payload.category = fields.category;
  if (fields.isPublic !== undefined) payload.is_public = fields.isPublic;
  if (fields.thumbnailUrl !== undefined) {
    payload.thumbnail_url = fields.thumbnailUrl;
    if (fields.thumbnailUrl === null) {
      payload.thumbnail_pos = null;
    }
  }
  if (fields.tags !== undefined) payload.tags = fields.tags;
  if (fields.thumbnailPositionX !== undefined || fields.thumbnailPositionY !== undefined) {
    if (fields.thumbnailPositionX !== null && fields.thumbnailPositionY !== null) {
      payload.thumbnail_pos = { x: fields.thumbnailPositionX, y: fields.thumbnailPositionY };
    }
  }

  const { error } = await client.from('apps').update(payload).eq('id', id);
  if (error) throw error;
}

export async function remove(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('apps').delete().eq('id', id);
  if (error) throw error;
}

export async function like(client: SupabaseClient, appId: string, userId: string): Promise<void> {
  const { error } = await client
    .from('app_likes')
    .insert({ app_id: appId, user_id: userId });

  if (error && error.code !== '23505') throw error;
}

export async function unlike(client: SupabaseClient, appId: string, userId: string): Promise<void> {
  const { error } = await client
    .from('app_likes')
    .delete()
    .match({ app_id: appId, user_id: userId });

  if (error) throw error;
}
