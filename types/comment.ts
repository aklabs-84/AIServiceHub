export type CommentTargetType = 'app' | 'prompt';

export interface Comment {
  id: string;
  targetId: string;
  targetType: CommentTargetType;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}
