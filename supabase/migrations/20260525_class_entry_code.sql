-- ============================================================
-- class_entry_code 추가: 클래스 단일 입장코드 (전원 공용)
-- ============================================================

ALTER TABLE education_courses
  ADD COLUMN IF NOT EXISTS class_entry_code TEXT;

-- 고유 인덱스 (입장코드로 클래스 조회 시 사용)
CREATE UNIQUE INDEX IF NOT EXISTS courses_class_entry_code_idx
  ON education_courses (class_entry_code)
  WHERE class_entry_code IS NOT NULL;
