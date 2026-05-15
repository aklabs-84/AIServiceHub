-- ============================================================
-- Initial Schema: Core tables created via Supabase dashboard
-- Must run before all other migrations
-- ============================================================

-- -------------------------
-- profiles
-- -------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  display_name    TEXT,
  role            TEXT NOT NULL DEFAULT 'user',
  avatar_url      TEXT,
  username        TEXT,
  minihompy_title TEXT,
  today_visits    INTEGER NOT NULL DEFAULT 0,
  total_visits    INTEGER NOT NULL DEFAULT 0,
  bg_color        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Role 변경 보호
CREATE OR REPLACE FUNCTION check_role_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND auth.uid() = NEW.id THEN
    RAISE EXCEPTION 'role cannot be changed by the user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_role_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION check_role_update();

-- 신규 유저 프로필 자동 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- -------------------------
-- categories
-- -------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL,
  label      TEXT NOT NULL,
  value      TEXT NOT NULL,
  color      TEXT,
  icon       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);

-- -------------------------
-- apps
-- -------------------------
CREATE TABLE IF NOT EXISTS apps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  app_urls        JSONB,
  sns_urls        TEXT[],
  category        TEXT,
  is_public       BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url   TEXT,
  thumbnail_pos   JSONB,
  attachments     JSONB,
  tags            TEXT[],
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  like_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apps_select"  ON apps FOR SELECT USING (is_public = true OR auth.uid() = created_by);
CREATE POLICY "apps_insert"  ON apps FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "apps_update"  ON apps FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "apps_delete"  ON apps FOR DELETE USING (auth.uid() = created_by);

-- -------------------------
-- app_likes
-- -------------------------
CREATE TABLE IF NOT EXISTS app_likes (
  app_id     UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, user_id)
);

ALTER TABLE app_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_likes_select" ON app_likes FOR SELECT USING (true);
CREATE POLICY "app_likes_insert" ON app_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "app_likes_delete" ON app_likes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_app_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE apps SET like_count = like_count + 1 WHERE id = NEW.app_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE apps SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.app_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_app_like_change
  AFTER INSERT OR DELETE ON app_likes
  FOR EACH ROW EXECUTE FUNCTION update_app_like_count();

-- -------------------------
-- prompts
-- -------------------------
CREATE TABLE IF NOT EXISTS prompts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  prompt_content  TEXT,
  sns_urls        TEXT[],
  category        TEXT,
  is_public       BOOLEAN NOT NULL DEFAULT false,
  thumbnail_url   TEXT,
  thumbnail_pos   JSONB,
  attachments     JSONB,
  tags            TEXT[],
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  like_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prompts_select" ON prompts FOR SELECT USING (is_public = true OR auth.uid() = created_by);
CREATE POLICY "prompts_insert" ON prompts FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "prompts_update" ON prompts FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "prompts_delete" ON prompts FOR DELETE USING (auth.uid() = created_by);

-- -------------------------
-- prompt_likes
-- -------------------------
CREATE TABLE IF NOT EXISTS prompt_likes (
  prompt_id  UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (prompt_id, user_id)
);

ALTER TABLE prompt_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prompt_likes_select" ON prompt_likes FOR SELECT USING (true);
CREATE POLICY "prompt_likes_insert" ON prompt_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prompt_likes_delete" ON prompt_likes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_prompt_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prompts SET like_count = like_count + 1 WHERE id = NEW.prompt_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE prompts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.prompt_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_prompt_like_change
  AFTER INSERT OR DELETE ON prompt_likes
  FOR EACH ROW EXECUTE FUNCTION update_prompt_like_count();

-- -------------------------
-- comments
-- -------------------------
CREATE TABLE IF NOT EXISTS comments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id            UUID NOT NULL,
  target_type          TEXT NOT NULL,
  content              TEXT NOT NULL,
  created_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name      TEXT,
  created_by_avatar_url TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "comments_update" ON comments FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (auth.uid() = created_by);

-- -------------------------
-- attachments
-- -------------------------
CREATE TABLE IF NOT EXISTS attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id    UUID NOT NULL,
  target_type  TEXT NOT NULL,
  name         TEXT NOT NULL,
  size         BIGINT NOT NULL,
  content_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_select" ON attachments FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "attachments_insert" ON attachments FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "attachments_delete" ON attachments FOR DELETE USING (auth.uid() = created_by);

-- -------------------------
-- editorial_collections
-- -------------------------
CREATE TABLE IF NOT EXISTS editorial_collections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  subtitle          TEXT,
  description       TEXT,
  card_image_url    TEXT,
  hero_image_url    TEXT,
  editorial_content TEXT,
  app_ids           UUID[],
  is_published      BOOLEAN NOT NULL DEFAULT false,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE editorial_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "editorial_collections_select" ON editorial_collections FOR SELECT USING (is_published = true);
CREATE POLICY "editorial_collections_all"    ON editorial_collections FOR ALL   USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION update_editorial_collections_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_editorial_collections_update
  BEFORE UPDATE ON editorial_collections
  FOR EACH ROW EXECUTE FUNCTION update_editorial_collections_updated_at();

-- -------------------------
-- one_time_access
-- -------------------------
CREATE TABLE IF NOT EXISTS one_time_access (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username            TEXT NOT NULL,
  password_hash       TEXT NOT NULL,
  duration_hours      INTEGER DEFAULT 24,
  session_token       TEXT,
  session_expires_at  TIMESTAMPTZ,
  used_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- service_role 전용, RLS 비활성화
ALTER TABLE one_time_access DISABLE ROW LEVEL SECURITY;

-- -------------------------
-- push_subscriptions
-- -------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_select" ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_insert" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_delete" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);
