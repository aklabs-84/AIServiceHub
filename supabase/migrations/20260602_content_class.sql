-- ============================================================
-- Content Class Type Migration
-- course_type에 'content' 추가 + 날짜 컬럼 nullable
-- ============================================================

-- 1. CHECK 제약 변경 (content 추가)
ALTER TABLE education_courses
  DROP CONSTRAINT IF EXISTS education_courses_course_type_check;

ALTER TABLE education_courses
  ADD CONSTRAINT education_courses_course_type_check
  CHECK (course_type IN ('online', 'offline', 'hybrid', 'content'));

-- 2. start_at, end_at nullable 허용 (content 타입은 날짜 불필요)
ALTER TABLE education_courses ALTER COLUMN start_at DROP NOT NULL;
ALTER TABLE education_courses ALTER COLUMN end_at   DROP NOT NULL;

-- 3. content 타입은 start_at 기준 정렬 불가 → created_at 보조 인덱스
CREATE INDEX IF NOT EXISTS courses_content_type_idx
  ON education_courses (course_type, created_at DESC)
  WHERE course_type = 'content';
