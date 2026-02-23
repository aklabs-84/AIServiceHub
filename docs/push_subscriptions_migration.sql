-- Supabase SQL Editor에서 실행하세요
-- push_subscriptions 테이블: Web Push 알림 구독 정보 저장

create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz default now() not null
);

-- 유저당 중복 방지 (같은 endpoint는 upsert)
create unique index if not exists push_subscriptions_endpoint_idx on push_subscriptions(endpoint);

-- RLS
alter table push_subscriptions enable row level security;

-- 본인 구독만 관리 가능
create policy "Users can manage own subscriptions"
  on push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 서비스 롤은 전체 접근 (서버에서 알림 발송 시)
create policy "Service role full access"
  on push_subscriptions
  for all
  to service_role
  using (true);
