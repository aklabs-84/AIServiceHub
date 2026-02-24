// Unified database module
//
// Client components:
//   import { db, getBrowserClient } from '@/lib/database';
//
// Server components:
//   import { getServerClient } from '@/lib/database/server';
//   import { db } from '@/lib/database';
//
// API routes (admin):
//   import { getAdminClient } from '@/lib/database';

export { getBrowserClient, getAdminClient } from './client';

import * as apps from './apps';
import * as prompts from './prompts';
import * as comments from './comments';
import * as categories from './categories';
import * as attachments from './attachments';
import * as auth from './auth';
import * as oneTimeAccess from './one-time-access';
import * as collections from './collections';
import * as posts from './posts';

export const db = {
  apps,
  prompts,
  comments,
  categories,
  attachments,
  auth,
  oneTimeAccess,
  collections,
  posts,
};

// Re-export types for convenience
export type {
  AIApp,
  Prompt,
  Post,
  Comment,
  Attachment,
  Category,
  UserProfile,
  Collection,
  CreateAppInput,
  UpdateAppInput,
  CreatePromptInput,
  UpdatePromptInput,
  CreateCategoryInput,
  CreateCollectionInput,
  UpdateCollectionInput,
  CreatePostInput,
  CommentTargetType,
  CategoryType,
  AppUrlItem,
} from '@/types/database';
