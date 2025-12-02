export type AppCategory =
  | 'chatbot'
  | 'content-generation'
  | 'data-analysis'
  | 'image-generation'
  | 'code-assistant'
  | 'translation'
  | 'education'
  | 'game'
  | 'productivity'
  | 'other';

export interface AIApp {
  id: string;
  name: string;
  description: string;
  appUrl: string;
  category: AppCategory;
  thumbnailUrl?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  likes: string[];
  likeCount: number;
}

export interface CreateAppInput {
  name: string;
  description: string;
  appUrl: string;
  category: AppCategory;
  thumbnailUrl?: string;
  createdByName: string;
}

export interface UpdateAppInput extends Partial<CreateAppInput> {
  id: string;
}
