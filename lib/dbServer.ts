import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { mapAppFromDB, mapPromptFromDB, mapCommentFromDB } from '@/lib/dbMappings';
import { AppCategory } from '@/types/app';
import { PromptCategory } from '@/types/prompt';
import { CommentTargetType } from '@/types/comment';
import type { AIApp } from '@/types/app';
import type { Prompt } from '@/types/prompt';
import type { Comment } from '@/types/comment';
import type { CategoryRecord, CategoryType } from '@/types/category';

export async function getAllAppsServer(): Promise<AIApp[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('apps')
    .select('*, app_likes(user_id)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapAppFromDB);
}

export async function getAppsByCategoryServer(category: AppCategory): Promise<AIApp[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('apps')
    .select('*, app_likes(user_id)')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapAppFromDB);
}

export async function getAppByIdServer(id: string): Promise<AIApp | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('apps')
    .select('*, app_likes(user_id)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapAppFromDB(data);
}

export async function getAllPromptsServer(): Promise<Prompt[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('prompts')
    .select('*, prompt_likes(user_id)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapPromptFromDB);
}

export async function getPromptsByCategoryServer(category: PromptCategory): Promise<Prompt[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('prompts')
    .select('*, prompt_likes(user_id)')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapPromptFromDB);
}

export async function getPromptByIdServer(id: string): Promise<Prompt | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('prompts')
    .select('*, prompt_likes(user_id)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapPromptFromDB(data);
}

export async function getCommentsServer(targetId: string, targetType: CommentTargetType): Promise<Comment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('target_id', targetId)
    .eq('target_type', targetType)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapCommentFromDB);
}

export async function getAllCommentsServer(): Promise<Comment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapCommentFromDB);
}

export async function getAppsByUserServer(userId: string): Promise<AIApp[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('apps')
    .select('*, app_likes(user_id)')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapAppFromDB);
}

export async function getPromptsByUserServer(userId: string): Promise<Prompt[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('prompts')
    .select('*, prompt_likes(user_id)')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapPromptFromDB);
}

export async function getLikedAppsByUserServer(userId: string): Promise<AIApp[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('app_likes')
    .select('app:apps(*, app_likes(user_id))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data
    .map((item: any) => item.app)
    .filter(Boolean)
    .map(mapAppFromDB)
    .filter((app: AIApp) => app.isPublic || app.createdBy === userId);
}

export async function getLikedPromptsByUserServer(userId: string): Promise<Prompt[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('prompt_likes')
    .select('prompt:prompts(*, prompt_likes(user_id))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data
    .map((item: any) => item.prompt)
    .filter(Boolean)
    .map(mapPromptFromDB)
    .filter((prompt: Prompt) => prompt.isPublic || prompt.createdBy === userId);
}

export async function getAllUsersServer() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) throw error;
  return data.map((d: any) => ({
    id: d.id,
    email: d.email,
    displayName: d.display_name,
    role: d.role || 'user',
    createdAt: new Date(d.created_at),
  }));
}

export async function getCategoriesByTypeServer(type: CategoryType): Promise<CategoryRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: true });

  if (error) throw error;
  const items = (data as CategoryRecord[]) || [];
  const map = new Map<string, CategoryRecord>();
  items.forEach((item) => {
    if (!item?.value) return;
    map.set(item.value, item);
  });
  return Array.from(map.values());
}
