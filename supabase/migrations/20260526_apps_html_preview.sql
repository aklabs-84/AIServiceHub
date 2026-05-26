-- apps 테이블에 html_preview_url 컬럼 추가
-- 관리자가 단일 HTML 파일 코드를 붙여넣으면
-- Supabase Storage에 업로드 후 CDN URL을 이 컬럼에 저장
ALTER TABLE apps
  ADD COLUMN IF NOT EXISTS html_preview_url TEXT;
