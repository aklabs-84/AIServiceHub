-- posts 테이블에 topic 컬럼 추가
ALTER TABLE posts ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT 'chat';
