
-- 1. Profiles Table (extends auth.users)
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  display_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 2. Categories Table
create table public.categories (
  id uuid not null default gen_random_uuid(),
  type text not null, -- 'app' or 'prompt'
  label text not null,
  value text not null,
  color text,
  icon text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

alter table public.categories enable row level security;

create policy "Categories are viewable by everyone."
  on categories for select
  using ( true );

create policy "Authenticated users can create categories."  -- Or restrict to admin? Assuming open for now based on previous code
  on categories for insert
  with check ( auth.role() = 'authenticated' );

-- 3. Apps Table (Vibe Coding items)
create table public.apps (
  id uuid not null default gen_random_uuid(),
  name text not null,
  description text,
  app_urls jsonb default '[]'::jsonb, -- Array of {url, isPublic, label}
  sns_urls text[] default array[]::text[],
  category text,
  is_public boolean default true,
  thumbnail_url text,
  thumbnail_pos jsonb, -- {x, y}
  attachments jsonb default '[]'::jsonb,
  tags text[] default array[]::text[],
  created_by uuid references public.profiles(id),
  created_by_name text, -- Denormalized
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

alter table public.apps enable row level security;

create policy "Public apps are viewable by everyone."
  on apps for select
  using ( is_public = true or auth.uid() = created_by );

create policy "Users can create apps."
  on apps for insert
  with check ( auth.uid() = created_by );

create policy "Users can update own apps."
  on apps for update
  using ( auth.uid() = created_by );

create policy "Users can delete own apps."
  on apps for delete
  using ( auth.uid() = created_by );

-- 4. Prompts Table
create table public.prompts (
  id uuid not null default gen_random_uuid(),
  name text not null,
  description text,
  prompt_content text,
  sns_urls text[] default array[]::text[],
  category text,
  is_public boolean default true,
  thumbnail_url text,
  thumbnail_pos jsonb,
  attachments jsonb default '[]'::jsonb,
  tags text[] default array[]::text[],
  created_by uuid references public.profiles(id),
  created_by_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

alter table public.prompts enable row level security;

create policy "Public prompts are viewable by everyone."
  on prompts for select
  using ( is_public = true or auth.uid() = created_by );

create policy "Users can create prompts."
  on prompts for insert
  with check ( auth.uid() = created_by );

create policy "Users can update own prompts."
  on prompts for update
  using ( auth.uid() = created_by );

create policy "Users can delete own prompts."
  on prompts for delete
  using ( auth.uid() = created_by );

-- 5. Comments Table
create table public.comments (
  id uuid not null default gen_random_uuid(),
  target_id uuid not null,
  target_type text not null, -- 'app' or 'prompt'
  content text not null,
  created_by uuid references public.profiles(id),
  created_by_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone."
  on comments for select
  using ( true );

create policy "Authenticated users can create comments."
  on comments for insert
  with check ( auth.role() = 'authenticated' );

create policy "Users can update own comments."
  on comments for update
  using ( auth.uid() = created_by );

create policy "Users can delete own comments."
  on comments for delete
  using ( auth.uid() = created_by );

-- 6. Likes Tables (Relational)
create table public.app_likes (
  app_id uuid references public.apps(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (app_id, user_id)
);

alter table public.app_likes enable row level security;

create policy "App likes are viewable by everyone."
  on app_likes for select
  using ( true );

create policy "Users can insert their own like."
  on app_likes for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own like."
  on app_likes for delete
  using ( auth.uid() = user_id );

create table public.prompt_likes (
  prompt_id uuid references public.prompts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (prompt_id, user_id)
);

alter table public.prompt_likes enable row level security;

create policy "Prompt likes are viewable by everyone."
  on prompt_likes for select
  using ( true );

create policy "Users can insert their own like."
  on prompt_likes for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own like."
  on prompt_likes for delete
  using ( auth.uid() = user_id );

-- 7. Trigger to handle new user signup (Optional but recommended)
-- This ensures a profile is created when a user signs up via Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. Storage Buckets (If not already created)
-- Note: You usually create buckets in the dashboard, but RLS for storage can be set here if needed.
-- We assume a bucket named 'images' or similar exists.
