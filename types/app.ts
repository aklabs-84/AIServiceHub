export type AppCategory = string;

export interface AppAttachment {
  name: string;
  size: number;
  contentType: string;
  downloadUrl?: string;
  storagePath: string;
}

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
  attachments: AppAttachment[];
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
  attachments?: AppAttachment[];
}

export interface UpdateAppInput extends Partial<CreateAppInput> {
  id: string;
}
