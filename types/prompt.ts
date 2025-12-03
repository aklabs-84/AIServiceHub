export type PromptCategory = 'daily' | 'work' | 'fun' | 'relationship' | 'education';

export interface Prompt {
  id: string;
  name: string;
  description: string;
  promptContent: string;
  snsUrls: string[];
  category: PromptCategory;
  thumbnailUrl?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromptInput {
  name: string;
  description: string;
  promptContent: string;
  snsUrls: string[];
  category: PromptCategory;
  thumbnailUrl?: string;
  createdByName: string;
}

export interface UpdatePromptInput extends Partial<CreatePromptInput> {
  id: string;
}
