-- ============================================================
-- Education / Class System Migration
-- 실제 Supabase에 적용된 스키마 기준
-- ============================================================

-- -------------------------
-- education_courses (클래스)
-- -------------------------
CREATE TABLE IF NOT EXISTS education_courses (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT,
  thumbnail_url    TEXT,
  thumbnail_pos    JSONB,                    -- { x: 50, y: 50 }
  course_type      TEXT        NOT NULL DEFAULT 'online'
                               CHECK (course_type IN ('online', 'offline', 'hybrid')),
  start_at         TIMESTAMPTZ NOT NULL,
  end_at           TIMESTAMPTZ NOT NULL,
  location         TEXT,                     -- 오프라인 장소명 or 온라인 플랫폼명
  materials        JSONB,                    -- [{type, title, url, desc}]
  material_url     TEXT,                     -- 외부 자료 페이지 URL
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  max_participants INTEGER,                  -- NULL = 무제한
  price            INTEGER     NOT NULL DEFAULT 0,
  is_paid          BOOLEAN     NOT NULL DEFAULT false,
  is_published     BOOLEAN     NOT NULL DEFAULT false,
  like_count       INTEGER     NOT NULL DEFAULT 0,
  created_by       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE education_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_select_published" ON education_courses
  FOR SELECT USING (is_published = true);

-- -------------------------
-- education_enrollments (수강 신청)
-- -------------------------
CREATE TABLE IF NOT EXISTS education_enrollments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID        NOT NULL REFERENCES education_courses(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name    TEXT,
  user_email   TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'waitlist', 'confirmed', 'cancelled')),
  entry_code   TEXT        UNIQUE,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, user_id)
);

ALTER TABLE education_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_select_own" ON education_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "enrollments_insert_own" ON education_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "enrollments_update_own" ON education_enrollments
  FOR UPDATE USING (auth.uid() = user_id);

-- -------------------------
-- purchases product_type에 'education' 추가
-- -------------------------
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_product_type_check;
ALTER TABLE purchases ADD CONSTRAINT purchases_product_type_check
  CHECK (product_type IN ('app', 'prompt', 'subscription', 'education'));

-- -------------------------
-- 인덱스
-- -------------------------
CREATE INDEX IF NOT EXISTS courses_is_published_idx   ON education_courses (is_published);
CREATE INDEX IF NOT EXISTS courses_start_at_idx        ON education_courses (start_at);
CREATE INDEX IF NOT EXISTS enrollments_course_id_idx   ON education_enrollments (course_id);
CREATE INDEX IF NOT EXISTS enrollments_user_id_idx     ON education_enrollments (user_id);
CREATE INDEX IF NOT EXISTS enrollments_status_idx      ON education_enrollments (status);
CREATE INDEX IF NOT EXISTS enrollments_entry_code_idx  ON education_enrollments (entry_code);
