-- Add Minihompy columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS minihompy_title text,
ADD COLUMN IF NOT EXISTS today_visits integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_visits integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS bg_color text;

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  published_url text UNIQUE,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for lessons
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view published lessons"
  ON lessons FOR SELECT
  USING (is_published = true);

CREATE POLICY "Teachers can view their own lessons"
  ON lessons FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create lessons"
  ON lessons FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own lessons"
  ON lessons FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own lessons"
  ON lessons FOR DELETE
  USING (auth.uid() = teacher_id);


-- Create lesson_steps table
CREATE TABLE IF NOT EXISTS lesson_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  step_number integer NOT NULL,
  image_url text,
  content_markdown text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for lesson_steps
ALTER TABLE lesson_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view published lesson steps"
  ON lesson_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_steps.lesson_id
      AND lessons.is_published = true
    )
  );

CREATE POLICY "Teachers can view their own lesson steps"
  ON lesson_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_steps.lesson_id
      AND lessons.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create steps for their lessons"
  ON lesson_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_steps.lesson_id
      AND lessons.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update steps for their lessons"
  ON lesson_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_steps.lesson_id
      AND lessons.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete steps for their lessons"
  ON lesson_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = lesson_steps.lesson_id
      AND lessons.teacher_id = auth.uid()
    )
  );


-- Create guestbook table
CREATE TABLE IF NOT EXISTS guestbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  writer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for guestbook
ALTER TABLE guestbook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read a guestbook"
  ON guestbook FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can write to a guestbook"
  ON guestbook FOR INSERT
  WITH CHECK (auth.uid() = writer_id);

CREATE POLICY "Owners and writers can update their guestbook entries"
  ON guestbook FOR UPDATE
  USING (auth.uid() = writer_id OR auth.uid() = owner_id);

CREATE POLICY "Owners and Writers can delete their guestbook entries"
  ON guestbook FOR DELETE
  USING (auth.uid() = writer_id OR auth.uid() = owner_id);
