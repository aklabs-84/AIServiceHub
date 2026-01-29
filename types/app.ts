export type AppCategory = string;

export interface AppUrlItem {
  url: string;
  isPublic: boolean;
  label?: string;
}

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
  appUrl: string; // Deprecated, use appUrls
  appUrls: AppUrlItem[];
  snsUrls: string[];
  category: AppCategory;
  isPublic: boolean;
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
  appUrl?: string; // Optional for legacy support
  appUrls: AppUrlItem[];
  snsUrls: string[];
  category: AppCategory;
  isPublic?: boolean;
  thumbnailUrl?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  createdByName: string;
  attachments?: AppAttachment[];
}

export interface UpdateAppInput extends Partial<CreateAppInput> {
  id: string;
}
