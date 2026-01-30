
import { supabase } from './supabase';
import { AIApp, CreateAppInput, UpdateAppInput, AppCategory } from '@/types/app';
import { Prompt, CreatePromptInput, UpdatePromptInput, PromptCategory } from '@/types/prompt';
import { Comment, CommentTargetType } from '@/types/comment';
import { CategoryInput, CategoryRecord, CategoryType } from '@/types/category';

// --- Helpers for Data Mapping ---

function mapAppFromDB(data: any): AIApp {
  // Extract User IDs from the joined app_likes table [{user_id: '...'}, ...]
  const likes = data.app_likes?.map((l: any) => l.user_id) || [];

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    appUrl: data.app_urls?.[0]?.url || '',
    appUrls: data.app_urls || [],
    snsUrls: data.sns_urls || [],
    category: data.category,
    isPublic: data.is_public ?? true,
    thumbnailUrl: data.thumbnail_url,
    thumbnailPositionX: data.thumbnail_pos?.x,
    thumbnailPositionY: data.thumbnail_pos?.y,
    attachments: data.attachments || [],
    createdBy: data.created_by,
    createdByName: data.created_by_name || 'Anonymous',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    likes,
    likeCount: likes.length,
    tags: data.tags || [],
  };
}

function mapPromptFromDB(data: any): Prompt {
  const likes = data.prompt_likes?.map((l: any) => l.user_id) || [];

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    promptContent: data.prompt_content,
    snsUrls: data.sns_urls || [],
    category: data.category,
    isPublic: data.is_public ?? true,
    thumbnailUrl: data.thumbnail_url,
    thumbnailPositionX: data.thumbnail_pos?.x,
    thumbnailPositionY: data.thumbnail_pos?.y,
    attachments: data.attachments || [],
    createdBy: data.created_by,
    createdByName: data.created_by_name || 'Anonymous',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    likes,
    likeCount: likes.length,
    tags: data.tags || [],
  };
}

function mapCommentFromDB(data: any): Comment {
  return {
    id: data.id,
    targetId: data.target_id,
    targetType: data.target_type,
    content: data.content,
    createdBy: data.created_by,
    createdByName: data.created_by_name || 'Anonymous',
    createdAt: new Date(data.created_at),
  };
}

// --- Apps ---

export async function getAllApps(): Promise<AIApp[]> {
  const { data, error } = await supabase
    .from('apps')
    .select('*, app_likes(user_id)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapAppFromDB);
}

export async function getAppsByCategory(category: AppCategory): Promise<AIApp[]> {
  const { data, error } = await supabase
    .from('apps')
    .select('*, app_likes(user_id)')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapAppFromDB);
}

export async function getAppsByTag(tag: string): Promise<AIApp[]> {
  const { data, error } = await supabase
    .from('apps')
    .select('*, app_likes(user_id)')
    .contains('tags', [tag])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapAppFromDB);
}

export async function getAppById(id: string): Promise<AIApp | null> {
  const { data, error } = await supabase
    .from('apps')
    .select('*, app_likes(user_id)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapAppFromDB(data);
}

export async function getAppsByUser(userId: string): Promise<AIApp[]> {
  const { data, error } = await supabase
    .from('apps')
    .select('*, app_likes(user_id)')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapAppFromDB);
}

export async function getLikedAppsByUser(userId: string): Promise<AIApp[]> {
  // Join app_likes where user_id matches, then get the apps
  const { data, error } = await supabase
    .from('app_likes')
    .select('app:apps(*, app_likes(user_id))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Clean up structure
  return data
    .map((item: any) => item.app)
    .filter(Boolean)
    .map(mapAppFromDB)
    .filter((app: AIApp) => app.isPublic || app.createdBy === userId);
}

export async function createApp(input: CreateAppInput, userId: string): Promise<string> {
  const payload = {
    name: input.name,
    description: input.description,
    app_urls: input.appUrls,
    sns_urls: input.snsUrls,
    category: input.category,
    is_public: input.isPublic ?? true,
    thumbnail_url: input.thumbnailUrl,
    thumbnail_pos: { x: input.thumbnailPositionX, y: input.thumbnailPositionY },
    attachments: input.attachments,
    tags: input.tags,
    created_by: userId,
    created_by_name: input.createdByName,
    // created_at, updated_at handled by default/trigger or Supabase handles it if not provided?
    // SQL default is Now().
  };

  const { data, error } = await supabase
    .from('apps')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateApp(input: UpdateAppInput): Promise<void> {
  const { id, ...data } = input;

  const payload: any = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.appUrls !== undefined) payload.app_urls = data.appUrls;
  if (data.snsUrls !== undefined) payload.sns_urls = data.snsUrls;
  if (data.category !== undefined) payload.category = data.category;
  if (data.isPublic !== undefined) payload.is_public = data.isPublic;
  if (data.thumbnailUrl !== undefined) payload.thumbnail_url = data.thumbnailUrl;
  if (data.tags !== undefined) payload.tags = data.tags;

  // Handle thumbnail pos update effectively
  if (data.thumbnailPositionX !== undefined || data.thumbnailPositionY !== undefined) {
    // We ideally need previous value or just update object. 
    // simpler: assumed passed fully? Or just update fields.
    // For now construct object.
    payload.thumbnail_pos = { x: data.thumbnailPositionX, y: data.thumbnailPositionY };
  }

  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('apps')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteApp(id: string): Promise<void> {
  const { error } = await supabase.from('apps').delete().eq('id', id);
  if (error) throw error;
}

export async function likeApp(appId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('app_likes')
    .insert({ app_id: appId, user_id: userId });

  if (error) {
    // If unique violation, ignore? Or throw.
    // Ideally user shouldn't be able to click like if already liked.
    // Supabase returns error on conflict.
    if (error.code !== '23505') throw error; // unique_violation
  }
}

export async function unlikeApp(appId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('app_likes')
    .delete()
    .match({ app_id: appId, user_id: userId });

  if (error) throw error;
}

// --- Prompts ---

export async function getAllPrompts(): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*, prompt_likes(user_id)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapPromptFromDB);
}

export async function getPromptsByCategory(category: PromptCategory): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*, prompt_likes(user_id)')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapPromptFromDB);
}

export async function getPromptsByTag(tag: string): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*, prompt_likes(user_id)')
    .contains('tags', [tag])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapPromptFromDB);
}

export async function getPromptById(id: string): Promise<Prompt | null> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*, prompt_likes(user_id)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapPromptFromDB(data);
}

export async function getPromptsByUser(userId: string): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*, prompt_likes(user_id)')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapPromptFromDB);
}

export async function getLikedPromptsByUser(userId: string): Promise<Prompt[]> {
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
    .filter((p: Prompt) => p.isPublic || p.createdBy === userId);
}

export async function createPrompt(input: CreatePromptInput, userId: string, options?: { signal?: AbortSignal }): Promise<string> {
  const payload = {
    name: input.name,
    description: input.description,
    prompt_content: input.promptContent,
    sns_urls: input.snsUrls,
    category: input.category,
    is_public: input.isPublic ?? true,
    thumbnail_url: input.thumbnailUrl,
    thumbnail_pos: { x: input.thumbnailPositionX, y: input.thumbnailPositionY },
    attachments: input.attachments,
    tags: input.tags,
    created_by: userId,
    created_by_name: input.createdByName,
  };

  const query = supabase
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

export async function updatePrompt(input: UpdatePromptInput): Promise<void> {
  const { id, ...data } = input;
  const payload: any = { updated_at: new Date().toISOString() };

  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.promptContent !== undefined) payload.prompt_content = data.promptContent;
  if (data.snsUrls !== undefined) payload.sns_urls = data.snsUrls;
  if (data.category !== undefined) payload.category = data.category;
  if (data.isPublic !== undefined) payload.is_public = data.isPublic;
  if (data.thumbnailUrl !== undefined) payload.thumbnail_url = data.thumbnailUrl;
  if (data.tags !== undefined) payload.tags = data.tags;

  if (data.thumbnailPositionX !== undefined || data.thumbnailPositionY !== undefined) {
    payload.thumbnail_pos = { x: data.thumbnailPositionX, y: data.thumbnailPositionY };
  }

  const { error } = await supabase
    .from('prompts')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

export async function deletePrompt(id: string): Promise<void> {
  const { error } = await supabase.from('prompts').delete().eq('id', id);
  if (error) throw error;
}

export async function likePrompt(promptId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('prompt_likes')
    .insert({ prompt_id: promptId, user_id: userId });
  if (error && error.code !== '23505') throw error;
}

export async function unlikePrompt(promptId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('prompt_likes')
    .delete()
    .match({ prompt_id: promptId, user_id: userId });
  if (error) throw error;
}

// --- Comments ---

export async function getAllComments(): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapCommentFromDB);
}

export async function getComments(targetId: string, targetType: CommentTargetType): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('target_id', targetId)
    .eq('target_type', targetType)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapCommentFromDB);
}

export async function addComment(targetId: string, targetType: CommentTargetType, content: string, userId: string, userName: string): Promise<string> {
  const { data, error } = await supabase
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

export async function updateComment(commentId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId);

  if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

// --- Categories ---

export async function getCategoriesByType(type: CategoryType): Promise<CategoryRecord[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: true });

  if (error) throw error;
  // Map snake_case to ... actually categories fields are simple? 
  // Schema: type, label, value, color, icon, created_at
  // Interface: same.
  return data.map((d: any) => ({
    ...d,
    createdAt: new Date(d.created_at),
  }));
}

export async function createCategory(input: CategoryInput): Promise<string> {
  const { data, error } = await supabase
    .from('categories')
    .insert(input)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateCategory(id: string, data: Partial<Pick<CategoryInput, 'label' | 'color' | 'icon'>>): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// --- Users (Profiles) ---

export interface UserProfile {
  id: string;
  email?: string;
  displayName?: string;
  role?: 'user' | 'admin';
  createdAt?: Date;
}

export async function getAllUsers(): Promise<UserProfile[]> {
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

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) throw error;
}

export async function ensureUserProfile(uid: string, email?: string | null, displayName?: string | null) {
  // Try upsert
  const { error } = await supabase.from('profiles').upsert({
    id: uid,
    email: email || undefined,
    display_name: displayName || undefined,
    // created_at default
  }, { onConflict: 'id' });

  if (error) console.error('ensureUserProfile error:', error);
}
