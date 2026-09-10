-- ============================================================
-- ClassLog 연동: 강좌 → ClassLog 클래스 동기화
-- ============================================================
-- classlog_sync_enabled: 기존 course_type(online/offline/hybrid/content)과는
--   별개의 플래그. true면 강좌 생성 시 ClassLog에 클래스를 자동 생성한다.
-- classlog_class_id / classlog_entry_code: 동기화 결과(ClassLog 쪽 식별자)를
--   저장해 재동기화 없이 재사용한다.

ALTER TABLE education_courses
  ADD COLUMN IF NOT EXISTS classlog_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS classlog_class_id TEXT,
  ADD COLUMN IF NOT EXISTS classlog_entry_code TEXT;

COMMENT ON COLUMN education_courses.classlog_sync_enabled IS '강좌 생성 시 ClassLog에 클래스를 동기화할지 여부';
COMMENT ON COLUMN education_courses.classlog_class_id IS 'ClassLog classes.id (동기화 결과)';
COMMENT ON COLUMN education_courses.classlog_entry_code IS 'ClassLog classes.entry_code (동기화 결과, 스튜디오 진입에 사용)';
