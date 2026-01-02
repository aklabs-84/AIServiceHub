export type PromptCategory = string;

export interface PromptAttachment {
  name: string;
  size: number;
  contentType: string;
  downloadUrl?: string;
  storagePath: string;
}

export interface Prompt {
  id: string;
  name: string;
  description: string;
  promptContent: string;
  snsUrls: string[];
  category: PromptCategory;
  thumbnailUrl?: string;
  attachments: PromptAttachment[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  likes: string[];
  likeCount: number;
}

export interface CreatePromptInput {
  name: string;
  description: string;
  promptContent: string;
  snsUrls: string[];
  category: PromptCategory;
  thumbnailUrl?: string;
  createdByName: string;
  attachments?: PromptAttachment[];
}

export interface UpdatePromptInput extends Partial<CreatePromptInput> {
  id: string;
}
