
create table public.one_time_access (
  id uuid not null default gen_random_uuid(),
  username text not null,
  password text, -- Stored for reference as per original logic (careful!)
  password_hash text not null,
  duration_hours int,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  used_at timestamp with time zone,
  session_token text,
  session_expires_at timestamp with time zone,
  primary key (id)
);

alter table public.one_time_access enable row level security;

-- Only Admin can see/edit credentials via API (Service Role)
-- Public might need to query for login? 
-- The login route uses Service Role (Supabase Admin), so RLS can be restrictive.
-- Let's allow Service Role bypass (default) and deny anon/auth.

create policy "Deny all for public"
  on one_time_access
  for all
  using ( false );
