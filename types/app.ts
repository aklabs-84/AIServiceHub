export type AppCategory = string;

export interface AIApp {
  id: string;
  name: string;
  description: string;
  appUrl: string;
  snsUrls: string[];
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
  snsUrls: string[];
  category: AppCategory;
  thumbnailUrl?: string;
  createdByName: string;
}

export interface UpdateAppInput extends Partial<CreateAppInput> {
  id: string;
}
