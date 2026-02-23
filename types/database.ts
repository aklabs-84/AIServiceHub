// ============================================
// Database types - Single source of truth
// Maps to Supabase schema_v2 tables
// ============================================

// --- Row types (what comes from DB) ---

export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export interface CategoryRow {
  id: string;
  type: 'app' | 'prompt';
  label: string;
  value: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AppRow {
  id: string;
  name: string;
  description: string | null;
  app_urls: AppUrlItem[];
  sns_urls: string[];
  category: string | null;
  is_public: boolean;
  thumbnail_url: string | null;
  thumbnail_pos: { x: number; y: number } | null;
  tags: string[];
  like_count: number;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  app_likes?: { user_id: string }[];
}

export interface PromptRow {
  id: string;
  name: string;
  description: string | null;
  prompt_content: string | null;
  sns_urls: string[];
  category: string | null;
  is_public: boolean;
  thumbnail_url: string | null;
  thumbnail_pos: { x: number; y: number } | null;
  tags: string[];
  like_count: number;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  prompt_likes?: { user_id: string }[];
}

export interface AttachmentRow {
  id: string;
  target_id: string;
  target_type: 'app' | 'prompt';
  name: string;
  size: number;
  content_type: string;
  storage_path: string;
  created_by: string | null;
  created_at: string;
}

export interface CommentRow {
  id: string;
  target_id: string;
  target_type: 'app' | 'prompt';
  content: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppLikeRow {
  app_id: string;
  user_id: string;
  created_at: string;
}

export interface PromptLikeRow {
  prompt_id: string;
  user_id: string;
  created_at: string;
}

export interface OneTimeAccessRow {
  id: string;
  username: string;
  password_hash: string;
  duration_hours: number | null;
  created_at: string;
  used_at: string | null;
  session_token: string | null;
  session_expires_at: string | null;
}

// --- Shared types (used in jsonb columns) ---

export interface AppUrlItem {
  url: string;
  isPublic: boolean;
  label?: string;
}

// --- Application-level types (camelCase, used in components) ---

export interface AIApp {
  id: string;
  name: string;
  description: string;
  appUrls: AppUrlItem[];
  snsUrls: string[];
  category: string;
  isPublic: boolean;
  thumbnailUrl?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  attachments: Attachment[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  likes: string[];
  likeCount: number;
  tags: string[];
}

export interface Prompt {
  id: string;
  name: string;
  description: string;
  promptContent: string;
  snsUrls: string[];
  category: string;
  isPublic: boolean;
  thumbnailUrl?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  attachments: Attachment[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  likes: string[];
  likeCount: number;
  tags: string[];
}

export interface Attachment {
  id: string;
  targetId: string;
  targetType: 'app' | 'prompt';
  name: string;
  size: number;
  contentType: string;
  storagePath: string;
  createdBy: string | null;
  createdAt: Date;
}

export interface Comment {
  id: string;
  targetId: string;
  targetType: 'app' | 'prompt';
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface Category {
  id: string;
  type: 'app' | 'prompt';
  value: string;
  label: string;
  color: string;
  icon: string;
  sortOrder: number;
}

// --- Input types (for create/update) ---

export interface CreateAppInput {
  name: string;
  description: string;
  appUrls: AppUrlItem[];
  snsUrls: string[];
  category: string;
  isPublic?: boolean;
  thumbnailUrl?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  createdByName: string;
  tags?: string[];
}

export interface UpdateAppInput extends Partial<CreateAppInput> {
  id: string;
}

export interface CreatePromptInput {
  name: string;
  description: string;
  promptContent: string;
  snsUrls: string[];
  category: string;
  isPublic?: boolean;
  thumbnailUrl?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  createdByName: string;
  tags?: string[];
}

export interface UpdatePromptInput extends Partial<CreatePromptInput> {
  id: string;
}

export interface CreateCategoryInput {
  type: 'app' | 'prompt';
  value: string;
  label: string;
  color: string;
  icon: string;
}

export type CommentTargetType = 'app' | 'prompt';
export type CategoryType = 'app' | 'prompt';

// Legacy aliases for backward compatibility during migration
export type AppCategory = string;
export type PromptCategory = string;

// --- Editorial Collections ---

export interface CollectionRow {
  id: string;
  slug: string;
  subtitle: string | null;
  title: string;
  description: string | null;
  card_image_url: string | null;
  hero_image_url: string | null;
  editorial_content: string | null;
  app_ids: string[];
  is_published: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  slug: string;
  subtitle: string;
  title: string;
  description: string;
  cardImageUrl?: string;
  heroImageUrl?: string;
  editorialContent: string;
  appIds: string[];
  isPublished: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCollectionInput {
  slug: string;
  subtitle?: string;
  title: string;
  description?: string;
  cardImageUrl?: string;
  heroImageUrl?: string;
  editorialContent?: string;
  appIds?: string[];
  isPublished?: boolean;
  sortOrder?: number;
}

export interface UpdateCollectionInput extends Partial<CreateCollectionInput> {
  id: string;
}
