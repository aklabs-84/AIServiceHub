-- ============================================================
-- Education / Class System Migration
-- education_courses, education_enrollments 테이블
-- ============================================================

-- -------------------------
-- education_courses (클래스)
-- -------------------------
CREATE TABLE IF NOT EXISTS education_courses (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  description       TEXT,
  content           TEXT,                -- 마크다운 상세 내용 (강의 계획 등)
  schedule_at       TIMESTAMPTZ,         -- 수업 일시
  duration_minutes  INTEGER     NOT NULL DEFAULT 60,
  location_type     TEXT        NOT NULL DEFAULT 'online'
                                CHECK (location_type IN ('online', 'offline', 'hybrid')),
  location_detail   TEXT,                -- 주소 또는 온라인 링크 (비공개)
  capacity          INTEGER     NOT NULL DEFAULT 0, -- 0 = 무제한
  price             INTEGER     NOT NULL DEFAULT 0,
  is_paid           BOOLEAN     NOT NULL DEFAULT false,
  is_public         BOOLEAN     NOT NULL DEFAULT true,
  thumbnail_url     TEXT,
  tags              TEXT[]      NOT NULL DEFAULT '{}',
  class_code        TEXT        UNIQUE,  -- 오프라인 체크인용 공용 코드 (QR)
  resource_url      TEXT,                -- 메인 수업 자료 URL
  resource_urls     JSONB       NOT NULL DEFAULT '[]', -- [{title, url, type}]
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE education_courses ENABLE ROW LEVEL SECURITY;

-- 공개 강좌는 누구나 조회 가능
CREATE POLICY "courses_select_public" ON education_courses
  FOR SELECT USING (is_public = true);

-- 관리자(service role)만 insert/update/delete
-- (API 라우트에서 getAdminClient() 사용 → service role bypasses RLS)

-- -------------------------
-- education_enrollments (수강 신청)
-- -------------------------
CREATE TABLE IF NOT EXISTS education_enrollments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id         UUID        NOT NULL REFERENCES education_courses(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'confirmed', 'waitlist', 'cancelled')),
  entry_code        TEXT        UNIQUE,   -- 개인 온라인 입장코드 (승인 시 생성)
  purchase_order_id TEXT,                 -- 유료 클래스의 구매 order_id
  notes             TEXT,                 -- 관리자 메모
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, user_id)              -- 중복 신청 방지
);

ALTER TABLE education_enrollments ENABLE ROW LEVEL SECURITY;

-- 본인 수강 신청 내역만 조회 가능
CREATE POLICY "enrollments_select_own" ON education_enrollments
  FOR SELECT USING (auth.uid() = user_id);

-- 본인이 신청 가능
CREATE POLICY "enrollments_insert_own" ON education_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인이 취소 가능 (update)
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
CREATE INDEX IF NOT EXISTS courses_is_public_idx        ON education_courses (is_public);
CREATE INDEX IF NOT EXISTS courses_schedule_at_idx      ON education_courses (schedule_at);
CREATE INDEX IF NOT EXISTS enrollments_course_id_idx    ON education_enrollments (course_id);
CREATE INDEX IF NOT EXISTS enrollments_user_id_idx      ON education_enrollments (user_id);
CREATE INDEX IF NOT EXISTS enrollments_status_idx       ON education_enrollments (status);
CREATE INDEX IF NOT EXISTS enrollments_entry_code_idx   ON education_enrollments (entry_code);
