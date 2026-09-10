-- classlog 전용 공유 플래그: apps에 이어 prompts에도 동일하게 추가.
-- AIServiceHub 사이트에는 노출하지 않지만 classlog의 /api/public/prompts
-- 연동에는 포함시키고 싶은 프롬프트를 위한 컬럼.
alter table prompts
  add column if not exists classlog_only boolean not null default false;
