-- ============================================
-- AI LABS Database Schema v2
-- Supabase (PostgreSQL) - Clean redesign
-- Safe to run on existing database (idempotent)
-- ============================================

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now() not null,
  primary key (id)
);

-- Add avatar_url if not exists (safe for existing table)
alter table public.profiles add column if not exists avatar_url text;

alter table public.profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_select_all') then
    create policy "profiles_select_all" on profiles for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_insert_own') then
    create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_update_own') then
    create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
  end if;
end $$;

-- Trigger: prevent non-admins from changing role
create or replace function public.check_role_update()
returns trigger as $$
begin
  if NEW.role <> OLD.role then
    if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
      raise exception 'Only admins can change user roles.';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists ensure_admin_role_update on profiles;
create trigger ensure_admin_role_update
  before update on profiles
  for each row execute function check_role_update();

-- Trigger: auto-create profile on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Categories
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('app', 'prompt')),
  label text not null,
  value text not null,
  color text,
  icon text,
  sort_order int default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (type, value)
);

-- Add sort_order if not exists
alter table public.categories add column if not exists sort_order int default 0;

alter table public.categories enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'categories' and policyname = 'categories_select_all') then
    create policy "categories_select_all" on categories for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'categories' and policyname = 'categories_insert_auth') then
    create policy "categories_insert_auth" on categories for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'categories' and policyname = 'categories_update_auth') then
    create policy "categories_update_auth" on categories for update using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'categories' and policyname = 'categories_delete_auth') then
    create policy "categories_delete_auth" on categories for delete using (auth.role() = 'authenticated');
  end if;
end $$;


-- 3. Apps
create table if not exists public.apps (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  app_urls jsonb default '[]'::jsonb,
  sns_urls text[] default array[]::text[],
  category text,
  is_public boolean default true,
  thumbnail_url text,
  thumbnail_pos jsonb,
  tags text[] default array[]::text[],
  like_count int default 0,
  created_by uuid references public.profiles(id),
  created_by_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Add new columns if not exists
alter table public.apps add column if not exists like_count int default 0;
alter table public.apps add column if not exists tags text[] default array[]::text[];

alter table public.apps enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'apps' and policyname = 'apps_select_public') then
    create policy "apps_select_public" on apps for select using (is_public = true or auth.uid() = created_by);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'apps' and policyname = 'apps_insert_own') then
    create policy "apps_insert_own" on apps for insert with check (auth.uid() = created_by);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'apps' and policyname = 'apps_update_own') then
    create policy "apps_update_own" on apps for update using (auth.uid() = created_by);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'apps' and policyname = 'apps_delete_own') then
    create policy "apps_delete_own" on apps for delete using (auth.uid() = created_by);
  end if;
end $$;

create index if not exists idx_apps_created_by on apps(created_by);
create index if not exists idx_apps_category on apps(category);
create index if not exists idx_apps_created_at on apps(created_at desc);


-- 4. Prompts
create table if not exists public.prompts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  prompt_content text,
  sns_urls text[] default array[]::text[],
  category text,
  is_public boolean default true,
  thumbnail_url text,
  thumbnail_pos jsonb,
  tags text[] default array[]::text[],
  like_count int default 0,
  created_by uuid references public.profiles(id),
  created_by_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Add new columns if not exists
alter table public.prompts add column if not exists like_count int default 0;
alter table public.prompts add column if not exists tags text[] default array[]::text[];

alter table public.prompts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'prompts' and policyname = 'prompts_select_public') then
    create policy "prompts_select_public" on prompts for select using (is_public = true or auth.uid() = created_by);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'prompts' and policyname = 'prompts_insert_own') then
    create policy "prompts_insert_own" on prompts for insert with check (auth.uid() = created_by);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'prompts' and policyname = 'prompts_update_own') then
    create policy "prompts_update_own" on prompts for update using (auth.uid() = created_by);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'prompts' and policyname = 'prompts_delete_own') then
    create policy "prompts_delete_own" on prompts for delete using (auth.uid() = created_by);
  end if;
end $$;

create index if not exists idx_prompts_created_by on prompts(created_by);
create index if not exists idx_prompts_category on prompts(category);
create index if not exists idx_prompts_created_at on prompts(created_at desc);


-- 5. Attachments (normalized - replaces jsonb in apps/prompts)
create table if not exists public.attachments (
  id uuid default gen_random_uuid() primary key,
  target_id uuid not null,
  target_type text not null check (target_type in ('app', 'prompt')),
  name text not null,
  size bigint not null default 0,
  content_type text not null default 'application/octet-stream',
  storage_path text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now() not null
);

alter table public.attachments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'attachments' and policyname = 'attachments_select_all') then
    create policy "attachments_select_all" on attachments for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'attachments' and policyname = 'attachments_insert_auth') then
    create policy "attachments_insert_auth" on attachments for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'attachments' and policyname = 'attachments_delete_own') then
    create policy "attachments_delete_own" on attachments for delete using (auth.uid() = created_by);
  end if;
end $$;

create index if not exists idx_attachments_target on attachments(target_id, target_type);


-- 6. Comments
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  target_id uuid not null,
  target_type text not null check (target_type in ('app', 'prompt')),
  content text not null,
  created_by uuid references public.profiles(id),
  created_by_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.comments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'comments' and policyname = 'comments_select_all') then
    create policy "comments_select_all" on comments for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'comments' and policyname = 'comments_insert_auth') then
    create policy "comments_insert_auth" on comments for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'comments' and policyname = 'comments_update_own') then
    create policy "comments_update_own" on comments for update using (auth.uid() = created_by);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'comments' and policyname = 'comments_delete_own') then
    create policy "comments_delete_own" on comments for delete using (auth.uid() = created_by);
  end if;
end $$;

create index if not exists idx_comments_target on comments(target_id, target_type);


-- 7. App Likes
create table if not exists public.app_likes (
  app_id uuid references public.apps(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (app_id, user_id)
);

alter table public.app_likes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'app_likes' and policyname = 'app_likes_select_all') then
    create policy "app_likes_select_all" on app_likes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'app_likes' and policyname = 'app_likes_insert_own') then
    create policy "app_likes_insert_own" on app_likes for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'app_likes' and policyname = 'app_likes_delete_own') then
    create policy "app_likes_delete_own" on app_likes for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Trigger: update apps.like_count on insert/delete
create or replace function public.update_app_like_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update apps set like_count = like_count + 1 where id = NEW.app_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update apps set like_count = like_count - 1 where id = OLD.app_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_app_like_change on app_likes;
create trigger on_app_like_change
  after insert or delete on app_likes
  for each row execute function update_app_like_count();


-- 8. Prompt Likes
create table if not exists public.prompt_likes (
  prompt_id uuid references public.prompts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (prompt_id, user_id)
);

alter table public.prompt_likes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'prompt_likes' and policyname = 'prompt_likes_select_all') then
    create policy "prompt_likes_select_all" on prompt_likes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'prompt_likes' and policyname = 'prompt_likes_insert_own') then
    create policy "prompt_likes_insert_own" on prompt_likes for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'prompt_likes' and policyname = 'prompt_likes_delete_own') then
    create policy "prompt_likes_delete_own" on prompt_likes for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Trigger: update prompts.like_count on insert/delete
create or replace function public.update_prompt_like_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update prompts set like_count = like_count + 1 where id = NEW.prompt_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update prompts set like_count = like_count - 1 where id = OLD.prompt_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_prompt_like_change on prompt_likes;
create trigger on_prompt_like_change
  after insert or delete on prompt_likes
  for each row execute function update_prompt_like_count();


-- 9. One-Time Access
create table if not exists public.one_time_access (
  id uuid default gen_random_uuid() primary key,
  username text not null,
  password_hash text not null,
  duration_hours int,
  created_at timestamptz default now() not null,
  used_at timestamptz,
  session_token text,
  session_expires_at timestamptz
);

alter table public.one_time_access enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'one_time_access' and policyname = 'one_time_access_deny_all') then
    create policy "one_time_access_deny_all" on one_time_access for all using (false);
  end if;
end $$;
