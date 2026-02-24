-- posts와 comments 테이블에 avatar_url 컬럼 추가
ALTER TABLE posts    ADD COLUMN IF NOT EXISTS author_avatar_url TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS created_by_avatar_url TEXT;
