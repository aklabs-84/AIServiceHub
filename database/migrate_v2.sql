-- ============================================
-- AI LABS Migration: v1 → v2
-- Run this AFTER creating schema_v2 tables
-- Preserves all existing data
-- ============================================

-- 1. Add new columns to existing tables (safe with IF NOT EXISTS)

-- profiles: add avatar_url and role
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- apps: add like_count
ALTER TABLE apps ADD COLUMN IF NOT EXISTS like_count int DEFAULT 0;

-- prompts: add like_count
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS like_count int DEFAULT 0;

-- categories: add sort_order
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;


-- 2. Populate like_count from existing likes
UPDATE apps SET like_count = (
  SELECT count(*) FROM app_likes WHERE app_likes.app_id = apps.id
);

UPDATE prompts SET like_count = (
  SELECT count(*) FROM prompt_likes WHERE prompt_likes.prompt_id = prompts.id
);


-- 3. Migrate attachments from jsonb to attachments table
-- Apps attachments
INSERT INTO attachments (target_id, target_type, name, size, content_type, storage_path, created_by, created_at)
SELECT
  a.id as target_id,
  'app' as target_type,
  att->>'name' as name,
  COALESCE((att->>'size')::bigint, 0) as size,
  COALESCE(att->>'contentType', 'application/octet-stream') as content_type,
  att->>'storagePath' as storage_path,
  a.created_by,
  a.created_at
FROM apps a,
  jsonb_array_elements(a.attachments) as att
WHERE a.attachments IS NOT NULL
  AND jsonb_array_length(a.attachments) > 0
  AND att->>'storagePath' IS NOT NULL;

-- Prompts attachments
INSERT INTO attachments (target_id, target_type, name, size, content_type, storage_path, created_by, created_at)
SELECT
  p.id as target_id,
  'prompt' as target_type,
  att->>'name' as name,
  COALESCE((att->>'size')::bigint, 0) as size,
  COALESCE(att->>'contentType', 'application/octet-stream') as content_type,
  att->>'storagePath' as storage_path,
  p.created_by,
  p.created_at
FROM prompts p,
  jsonb_array_elements(p.attachments) as att
WHERE p.attachments IS NOT NULL
  AND jsonb_array_length(p.attachments) > 0
  AND att->>'storagePath' IS NOT NULL;


-- 4. Remove plain-text password from one_time_access (keep hash only)
ALTER TABLE one_time_access DROP COLUMN IF EXISTS password;


-- 5. Create indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_apps_created_by ON apps(created_by);
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_created_at ON apps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_created_by ON prompts(created_by);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_attachments_target ON attachments(target_id, target_type);


-- 6. Set default sort_order for existing categories
UPDATE categories SET sort_order = row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY created_at) as row_num
  FROM categories
) sub
WHERE categories.id = sub.id AND categories.sort_order = 0;


-- NOTE: After running this migration, the old 'attachments' jsonb column
-- in apps and prompts tables can be kept for backward compatibility
-- or dropped in a future migration:
-- ALTER TABLE apps DROP COLUMN IF EXISTS attachments;
-- ALTER TABLE prompts DROP COLUMN IF EXISTS attachments;
