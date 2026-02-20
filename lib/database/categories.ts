import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category, CategoryRow, CreateCategoryInput, CategoryType } from '@/types/database';

function mapCategoryFromDB(data: CategoryRow): Category {
  return {
    id: data.id,
    type: data.type as CategoryType,
    value: data.value,
    label: data.label,
    color: data.color || '',
    icon: data.icon || '',
    sortOrder: data.sort_order,
  };
}

export async function getByType(client: SupabaseClient, type: CategoryType): Promise<Category[]> {
  const { data, error } = await client
    .from('categories')
    .select('*')
    .eq('type', type)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  // Deduplicate by value
  const map = new Map<string, Category>();
  for (const row of data as CategoryRow[]) {
    const cat = mapCategoryFromDB(row);
    if (cat.value) {
      map.set(cat.value, cat);
    }
  }
  return Array.from(map.values());
}

export async function create(client: SupabaseClient, input: CreateCategoryInput): Promise<string> {
  const { data, error } = await client
    .from('categories')
    .insert(input)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function update(
  client: SupabaseClient,
  id: string,
  fields: Partial<Pick<CreateCategoryInput, 'label' | 'color' | 'icon'>>
): Promise<void> {
  const { error } = await client
    .from('categories')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function remove(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) throw error;
}
