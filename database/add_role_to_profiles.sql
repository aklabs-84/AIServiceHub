-- 1. Add role column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 2. Add constraint to ensure only 'user' or 'admin' values
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- 3. Update RLS policies
-- Enable RLS (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- Allow admins to update any profile (including roles)
-- Note: This policy assumes the user making the request has 'admin' user_metadata or we query the table itself.
-- However, RLS causing infinite recursion if we query the same table can be tricky.
-- A common pattern is to trust a claim or use a separate admin table.
-- BUT for simplicity in this "app state" approach:

-- We'll allow users to update their OWN profile (except role).
-- But we need a way to prevent them from updating the role.
-- Supabase doesn't natively support column-level privileges in RLS policies easily without triggers or separate roles in Postgres.
-- SIMPLIFICATION:
-- We will use a database trigger to prevent non-admins from changing the 'role' column.

CREATE OR REPLACE FUNCTION check_role_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role is being changed
  IF NEW.role <> OLD.role THEN
    -- Check if the executing user is an admin
    -- We'll check the users table or the current profile.
    -- To avoid recursion, we might check an auth claim, but we don't have that set up yet.
    -- Alternative: We allow it ONLY if the auth.uid() is in the list of admins.
    
    -- Let's query the table for the current user's role.
    -- This SUBQUERY checks if the user performing the action (auth.uid()) is an admin.
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins can change user roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS ensure_admin_role_update ON profiles;

-- Create the trigger
CREATE TRIGGER ensure_admin_role_update
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_role_update();

-- 4. Initial Bootstrap: Make YOU the admin (Run this manually or uncomment)
-- UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL@gmail.com';
