-- classlog 전용 공유 플래그: AIServiceHub 사이트에는 노출하지 않지만
-- classlog의 /api/public/apps 연동에는 포함시키고 싶은 앱을 위한 컬럼.
alter table apps
  add column if not exists classlog_only boolean not null default false;
