-- ============================================================
-- Remaining migrations combined (from _backup files)
-- Covers: posts_topic, avatar_url, comment_count, search_path fix,
--         lessoncast_minihompy, cover_image, pet_system, room_system
-- ============================================================

-- posts topic 컬럼
ALTER TABLE posts ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT 'chat';

-- posts, comments avatar_url 컬럼
ALTER TABLE posts    ADD COLUMN IF NOT EXISTS author_avatar_url TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS created_by_avatar_url TEXT;

-- posts comment_count 컬럼 + 자동 동기화 트리거
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.target_type = 'post' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.target_id::uuid;
  ELSIF TG_OP = 'DELETE' AND OLD.target_type = 'post' THEN
    UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.target_id::uuid;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_comment_count_trigger ON comments;
CREATE TRIGGER post_comment_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- function search_path 보안 설정
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'update_post_like_count' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.update_post_like_count() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'check_role_update' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.check_role_update() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'update_editorial_collections_updated_at' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.update_editorial_collections_updated_at() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'update_app_like_count' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.update_app_like_count() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'update_prompt_like_count' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.update_prompt_like_count() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'update_post_comment_count' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.update_post_comment_count() SET search_path = public, pg_temp;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'handle_new_user' AND p.pronargs = 0) THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
  END IF;
END;
$$;

-- profiles 미니홈피 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username        TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS minihompy_title TEXT,
  ADD COLUMN IF NOT EXISTS today_visits    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_visits    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bg_color        TEXT;

-- profiles cover_image_url
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- lessons
CREATE TABLE IF NOT EXISTS lessons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  published_url TEXT UNIQUE,
  is_published  BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_select_published" ON lessons FOR SELECT USING (is_published = true);
CREATE POLICY "lessons_select_own"       ON lessons FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "lessons_insert"           ON lessons FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "lessons_update"           ON lessons FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "lessons_delete"           ON lessons FOR DELETE USING (auth.uid() = teacher_id);

-- lesson_steps
CREATE TABLE IF NOT EXISTS lesson_steps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id        UUID REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  step_number      INTEGER NOT NULL,
  image_url        TEXT,
  content_markdown TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lesson_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_steps_select_published" ON lesson_steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM lessons WHERE lessons.id = lesson_steps.lesson_id AND lessons.is_published = true)
);
CREATE POLICY "lesson_steps_select_own" ON lesson_steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM lessons WHERE lessons.id = lesson_steps.lesson_id AND lessons.teacher_id = auth.uid())
);
CREATE POLICY "lesson_steps_insert" ON lesson_steps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM lessons WHERE lessons.id = lesson_steps.lesson_id AND lessons.teacher_id = auth.uid())
);
CREATE POLICY "lesson_steps_update" ON lesson_steps FOR UPDATE USING (
  EXISTS (SELECT 1 FROM lessons WHERE lessons.id = lesson_steps.lesson_id AND lessons.teacher_id = auth.uid())
);
CREATE POLICY "lesson_steps_delete" ON lesson_steps FOR DELETE USING (
  EXISTS (SELECT 1 FROM lessons WHERE lessons.id = lesson_steps.lesson_id AND lessons.teacher_id = auth.uid())
);

-- guestbook
CREATE TABLE IF NOT EXISTS guestbook (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  writer_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE guestbook ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guestbook_select" ON guestbook FOR SELECT USING (true);
CREATE POLICY "guestbook_insert" ON guestbook FOR INSERT WITH CHECK (auth.uid() = writer_id);
CREATE POLICY "guestbook_update" ON guestbook FOR UPDATE USING (auth.uid() = writer_id OR auth.uid() = owner_id);
CREATE POLICY "guestbook_delete" ON guestbook FOR DELETE USING (auth.uid() = writer_id OR auth.uid() = owner_id);

-- pets
CREATE TABLE IF NOT EXISTS pets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pet_type     TEXT NOT NULL DEFAULT 'cat',
  name         TEXT,
  exp          INTEGER NOT NULL DEFAULT 0,
  level        INTEGER NOT NULL DEFAULT 1,
  hunger       INTEGER NOT NULL DEFAULT 80,
  happiness    INTEGER NOT NULL DEFAULT 70,
  growth_stage TEXT NOT NULL DEFAULT 'baby',
  pos_x        FLOAT NOT NULL DEFAULT 50,
  pos_y        FLOAT NOT NULL DEFAULT 60,
  last_hunger_update TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pets_select" ON pets FOR SELECT USING (true);
CREATE POLICY "pets_insert" ON pets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pets_update" ON pets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pets_delete" ON pets FOR DELETE USING (auth.uid() = user_id);

-- pet_items
CREATE TABLE IF NOT EXISTS pet_items (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL,
  quantity  INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type)
);

ALTER TABLE pet_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pet_items_select" ON pet_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pet_items_insert" ON pet_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pet_items_update" ON pet_items FOR UPDATE USING (auth.uid() = user_id);

-- reward_logs
CREATE TABLE IF NOT EXISTS reward_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL,
  source_id   TEXT NOT NULL,
  item_type   TEXT,
  quantity    INTEGER NOT NULL DEFAULT 1,
  rewarded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reward_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reward_logs_select" ON reward_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reward_logs_insert" ON reward_logs FOR INSERT WITH CHECK (true);

-- room_items
CREATE TABLE IF NOT EXISTS room_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  asset_id   TEXT NOT NULL,
  pos_x      FLOAT NOT NULL DEFAULT 50,
  pos_y      FLOAT NOT NULL DEFAULT 60,
  z_idx      INTEGER NOT NULL DEFAULT 2,
  item_scale FLOAT NOT NULL DEFAULT 1.0,
  flip_x     BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE room_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room_items_select" ON room_items FOR SELECT USING (true);
CREATE POLICY "room_items_all"    ON room_items FOR ALL   USING (auth.uid() = user_id);

-- room_character
CREATE TABLE IF NOT EXISTS room_character (
  user_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  skin       TEXT NOT NULL DEFAULT 'beige',
  hair       TEXT NOT NULL DEFAULT 'brown',
  outfit     TEXT NOT NULL DEFAULT 'blue',
  anim       TEXT NOT NULL DEFAULT 'idle',
  pos_x      FLOAT NOT NULL DEFAULT 50,
  pos_y      FLOAT NOT NULL DEFAULT 65,
  room_theme TEXT NOT NULL DEFAULT 'cozy',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE room_character ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room_character_select" ON room_character FOR SELECT USING (true);
CREATE POLICY "room_character_all"    ON room_character FOR ALL   USING (auth.uid() = user_id);
