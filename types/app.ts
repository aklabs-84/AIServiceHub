export type AppCategory = string;

export interface AIApp {
  id: string;
  name: string;
  description: string;
  appUrl: string;
  snsUrls: string[];
  category: AppCategory;
  thumbnailUrl?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
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
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  createdByName: string;
}

export interface UpdateAppInput extends Partial<CreateAppInput> {
  id: string;
}
