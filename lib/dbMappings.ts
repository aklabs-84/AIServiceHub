import { AIApp } from '@/types/app';
import { Prompt } from '@/types/prompt';
import { Comment } from '@/types/comment';

export function mapAppFromDB(data: any): AIApp {
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

export function mapPromptFromDB(data: any): Prompt {
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

export function mapCommentFromDB(data: any): Comment {
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
