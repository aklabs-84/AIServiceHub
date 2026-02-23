import type { SupabaseClient } from '@supabase/supabase-js';
import type { Collection, CollectionRow, CreateCollectionInput, UpdateCollectionInput } from '@/types/database';

function mapCollectionFromDB(data: CollectionRow): Collection {
  return {
    id: data.id,
    slug: data.slug,
    subtitle: data.subtitle || '',
    title: data.title,
    description: data.description || '',
    cardImageUrl: data.card_image_url || undefined,
    heroImageUrl: data.hero_image_url || undefined,
    editorialContent: data.editorial_content || '',
    appIds: data.app_ids || [],
    isPublished: data.is_published,
    sortOrder: data.sort_order,
    createdBy: data.created_by,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function getAll(client: SupabaseClient): Promise<Collection[]> {
  const { data, error } = await client
    .from('editorial_collections')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as CollectionRow[]).map(mapCollectionFromDB);
}

export async function getPublished(client: SupabaseClient): Promise<Collection[]> {
  const { data, error } = await client
    .from('editorial_collections')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as CollectionRow[]).map(mapCollectionFromDB);
}

export async function getBySlug(client: SupabaseClient, slug: string): Promise<Collection | null> {
  const { data, error } = await client
    .from('editorial_collections')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return mapCollectionFromDB(data as CollectionRow);
}

export async function getById(client: SupabaseClient, id: string): Promise<Collection | null> {
  const { data, error } = await client
    .from('editorial_collections')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapCollectionFromDB(data as CollectionRow);
}

export async function create(
  client: SupabaseClient,
  input: CreateCollectionInput,
  userId: string
): Promise<string> {
  const { data, error } = await client
    .from('editorial_collections')
    .insert({
      slug: input.slug,
      subtitle: input.subtitle || null,
      title: input.title,
      description: input.description || null,
      card_image_url: input.cardImageUrl || null,
      hero_image_url: input.heroImageUrl || null,
      editorial_content: input.editorialContent || null,
      app_ids: input.appIds || [],
      is_published: input.isPublished ?? false,
      sort_order: input.sortOrder ?? 0,
      created_by: userId,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function update(
  client: SupabaseClient,
  input: UpdateCollectionInput
): Promise<void> {
  const { id, ...fields } = input;
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (fields.slug !== undefined) payload.slug = fields.slug;
  if (fields.subtitle !== undefined) payload.subtitle = fields.subtitle || null;
  if (fields.title !== undefined) payload.title = fields.title;
  if (fields.description !== undefined) payload.description = fields.description || null;
  if (fields.cardImageUrl !== undefined) payload.card_image_url = fields.cardImageUrl || null;
  if (fields.heroImageUrl !== undefined) payload.hero_image_url = fields.heroImageUrl || null;
  if (fields.editorialContent !== undefined) payload.editorial_content = fields.editorialContent || null;
  if (fields.appIds !== undefined) payload.app_ids = fields.appIds;
  if (fields.isPublished !== undefined) payload.is_published = fields.isPublished;
  if (fields.sortOrder !== undefined) payload.sort_order = fields.sortOrder;

  const { error } = await client.from('editorial_collections').update(payload).eq('id', id);
  if (error) throw error;
}

export async function remove(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('editorial_collections').delete().eq('id', id);
  if (error) throw error;
}
