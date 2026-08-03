/*
# Create initial database schema for StudyDock

## Overview
This migration creates the complete database schema for the StudyDock platform —
a university study resource sharing app with user profiles, uploaded resources,
browseable universities/categories, and personal in-class study notes with
voice recording and AI summaries.

## New Tables

1. **universities** — Reference data for universities (Stanford, MIT, Oxford, etc.)
   - id (uuid, PK)
   - name (text, unique, not null)
   - short (text, not null) — abbreviated name e.g. "MIT"
   - country (text, not null)
   - color (text) — Tailwind gradient classes for UI
   - departments_count (int, default 0) — number of departments
   - created_at (timestamptz)

2. **departments** — Departments within each university
   - id (uuid, PK)
   - university_id (uuid, FK → universities, CASCADE)
   - name (text, not null)

3. **subjects** — Popular subjects per university
   - id (uuid, PK)
   - university_id (uuid, FK → universities, CASCADE)
   - department (text)
   - name (text, not null)

4. **categories** — Resource categories (Lecture Notes, Lab Reports, etc.)
   - id (uuid, PK)
   - name (text, not null)
   - icon (text) — Lucide icon name for UI
   - description (text)

5. **profiles** — User profile data extending Supabase auth.users
   - id (uuid, PK, FK → auth.users, CASCADE)
   - full_name (text, not null)
   - avatar (text) — initials or image URL
   - university_id (uuid, FK → universities, SET NULL)
   - points (int, default 0) — gamification points
   - level (int, default 1)
   - uploads (int, default 0) — total resources uploaded
   - downloads (int, default 0) — total downloads received
   - badge (text, default 'Newbie') — Diamond/Platinum/Gold/etc.
   - verified (boolean, default false) — .edu email verification
   - created_at (timestamptz)

6. **resources** — Study materials uploaded by users
   - id (uuid, PK)
   - title (text, not null)
   - description (text)
   - university_id (uuid, FK → universities, SET NULL)
   - department (text)
   - course_code (text) — e.g. "CS229"
   - semester (text) — e.g. "Fall 2024"
   - subject (text)
   - file_type (text) — pdf/ppt/docx/zip/img/xlsx/video
   - file_size (text) — human-readable size e.g. "24.6 MB"
   - pages (int)
   - uploader_id (uuid, FK → profiles, SET NULL, DEFAULT auth.uid())
   - rating (numeric, default 0) — average rating 0-5
   - rating_count (int, default 0)
   - downloads (int, default 0)
   - views (int, default 0)
   - bookmarks (int, default 0)
   - tags (text[]) — array of tag strings
   - trending (boolean, default false)
   - featured (boolean, default false)
   - premium (boolean, default false)
   - category_id (uuid, FK → categories, SET NULL)
   - created_at (timestamptz)

7. **study_notes** — Personal in-class notes with optional voice recording
   - id (uuid, PK)
   - title (text, not null)
   - content (text) — the notepad text
   - user_id (uuid, NOT NULL, DEFAULT auth.uid(), FK → auth.users, CASCADE)
   - has_recording (boolean, default false)
   - recording_duration (text) — e.g. "5:32"
   - recording_url (text) — Supabase Storage path for audio file
   - summary (text) — AI-generated summary
   - created_at (timestamptz)
   - updated_at (timestamptz)

## Security (Row Level Security)

All tables have RLS enabled. Policy strategy:

- **Public reference data** (universities, departments, subjects, categories):
  SELECT open to anon + authenticated (anyone can browse). No writes from the
  frontend — these are managed via the Supabase dashboard.

- **profiles**: SELECT open to anon + authenticated (leaderboard is public).
  INSERT/UPDATE restricted to authenticated users owning their own profile row.

- **resources**: SELECT open to anon + authenticated (explore page is public).
  INSERT/UPDATE/DELETE restricted to the uploader (authenticated, owns the row).

- **study_notes**: All CRUD restricted to authenticated users who own the note.
  Study notes are private — no public read access.

## Indexes
- resources.uploader_id — for "my uploads" queries
- resources.university_id — for university-filtered browsing
- resources.category_id — for category-filtered browsing
- resources.created_at DESC — for "newest" sorting
- study_notes.user_id — for loading a user's notes
- profiles.university_id — for university-filtered leaderboards
- departments.university_id, subjects.university_id — for nested loads

## Notes
1. The `profiles.id` column references `auth.users(id)` so each profile maps
   1:1 to a Supabase auth account. A trigger auto-creates a profile row when a
   new user signs up.
2. `resources.uploader_id` defaults to `auth.uid()` so inserts from the
   frontend don't need to manually pass the owner.
3. `study_notes.user_id` defaults to `auth.uid()` for the same reason.
4. An `updated_at` trigger keeps `study_notes.updated_at` current on every UPDATE.
*/

-- ============================================================
-- 1. UNIVERSITIES (reference data)
-- ============================================================
CREATE TABLE IF NOT EXISTS universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  short text NOT NULL,
  country text NOT NULL,
  color text,
  departments_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_universities" ON universities;
CREATE POLICY "public_read_universities" ON universities FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- 2. DEPARTMENTS (reference data)
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_university_id ON departments(university_id);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_departments" ON departments;
CREATE POLICY "public_read_departments" ON departments FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- 3. SUBJECTS (reference data)
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  department text,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subjects_university_id ON subjects(university_id);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_subjects" ON subjects;
CREATE POLICY "public_read_subjects" ON subjects FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- 4. CATEGORIES (reference data)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- 5. PROFILES (user data extending auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  avatar text,
  university_id uuid REFERENCES universities(id) ON DELETE SET NULL,
  points int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  uploads int NOT NULL DEFAULT 0,
  downloads int NOT NULL DEFAULT 0,
  badge text NOT NULL DEFAULT 'Newbie',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_university_id ON profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_profiles_points ON profiles(points DESC);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Leaderboard is public — anyone can view profiles
DROP POLICY IF EXISTS "public_read_profiles" ON profiles;
CREATE POLICY "public_read_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

-- Users can create their own profile row
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- 6. RESOURCES (study materials)
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  university_id uuid REFERENCES universities(id) ON DELETE SET NULL,
  department text,
  course_code text,
  semester text,
  subject text,
  file_type text NOT NULL DEFAULT 'pdf',
  file_size text,
  pages int,
  uploader_id uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  rating numeric NOT NULL DEFAULT 0,
  rating_count int NOT NULL DEFAULT 0,
  downloads int NOT NULL DEFAULT 0,
  views int NOT NULL DEFAULT 0,
  bookmarks int NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  trending boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  premium boolean NOT NULL DEFAULT false,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_uploader_id ON resources(uploader_id);
CREATE INDEX IF NOT EXISTS idx_resources_university_id ON resources(university_id);
CREATE INDEX IF NOT EXISTS idx_resources_category_id ON resources(category_id);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_trending ON resources(trending) WHERE trending = true;

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Explore page is public — anyone can browse resources
DROP POLICY IF EXISTS "public_read_resources" ON resources;
CREATE POLICY "public_read_resources" ON resources FOR SELECT
  TO anon, authenticated USING (true);

-- Only authenticated users can upload, and only their own uploads
DROP POLICY IF EXISTS "insert_own_resources" ON resources;
CREATE POLICY "insert_own_resources" ON resources FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = uploader_id);

-- Only the uploader can modify their resource
DROP POLICY IF EXISTS "update_own_resources" ON resources;
CREATE POLICY "update_own_resources" ON resources FOR UPDATE
  TO authenticated USING (auth.uid() = uploader_id) WITH CHECK (auth.uid() = uploader_id);

-- Only the uploader can delete their resource
DROP POLICY IF EXISTS "delete_own_resources" ON resources;
CREATE POLICY "delete_own_resources" ON resources FOR DELETE
  TO authenticated USING (auth.uid() = uploader_id);

-- ============================================================
-- 7. STUDY_NOTES (personal in-class notes)
-- ============================================================
CREATE TABLE IF NOT EXISTS study_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled note',
  content text NOT NULL DEFAULT '',
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  has_recording boolean NOT NULL DEFAULT false,
  recording_duration text,
  recording_url text,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_notes_user_id ON study_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_updated_at ON study_notes(updated_at DESC);

ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;

-- Study notes are private — only the owner can access them
DROP POLICY IF EXISTS "select_own_study_notes" ON study_notes;
CREATE POLICY "select_own_study_notes" ON study_notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_study_notes" ON study_notes;
CREATE POLICY "insert_own_study_notes" ON study_notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_study_notes" ON study_notes;
CREATE POLICY "update_own_study_notes" ON study_notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_study_notes" ON study_notes;
CREATE POLICY "delete_own_study_notes" ON study_notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous'),
    COALESCE(NEW.raw_user_meta_data->>'avatar', UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', 'A'), 2)))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on study_notes
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS study_notes_updated_at ON study_notes;
CREATE TRIGGER study_notes_updated_at
  BEFORE UPDATE ON study_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SEED DATA — Universities
-- ============================================================
INSERT INTO universities (name, short, country, color, departments_count)
VALUES
  ('Stanford University', 'SU', 'United States', 'from-red-500 to-rose-600', 18),
  ('Massachusetts Institute of Technology', 'MIT', 'United States', 'from-slate-700 to-slate-900', 22),
  ('University of Oxford', 'OX', 'United Kingdom', 'from-blue-700 to-indigo-800', 16),
  ('National University of Singapore', 'NUS', 'Singapore', 'from-orange-500 to-red-600', 14),
  ('ETH Zurich', 'ETH', 'Switzerland', 'from-emerald-600 to-teal-700', 12),
  ('IIT Bombay', 'IITB', 'India', 'from-indigo-600 to-blue-700', 20)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED DATA — Departments
-- ============================================================
INSERT INTO departments (university_id, name)
SELECT id, dept FROM universities u
CROSS JOIN (VALUES
  ('Computer Science'), ('Electrical Engineering'), ('Mechanical Engineering'),
  ('Business'), ('Biology'), ('Mathematics')
) AS v(dept)
WHERE u.short = 'SU'
ON CONFLICT DO NOTHING;

INSERT INTO departments (university_id, name)
SELECT id, dept FROM universities u
CROSS JOIN (VALUES
  ('Computer Science'), ('Aerospace Engineering'), ('Physics'),
  ('Mathematics'), ('Chemistry')
) AS v(dept)
WHERE u.short = 'MIT'
ON CONFLICT DO NOTHING;

INSERT INTO departments (university_id, name)
SELECT id, dept FROM universities u
CROSS JOIN (VALUES
  ('Philosophy'), ('Law'), ('Medicine'), ('History'), ('English'), ('Economics')
) AS v(dept)
WHERE u.short = 'OX'
ON CONFLICT DO NOTHING;

INSERT INTO departments (university_id, name)
SELECT id, dept FROM universities u
CROSS JOIN (VALUES
  ('Computer Science'), ('Business'), ('Engineering'), ('Medicine'), ('Law')
) AS v(dept)
WHERE u.short = 'NUS'
ON CONFLICT DO NOTHING;

INSERT INTO departments (university_id, name)
SELECT id, dept FROM universities u
CROSS JOIN (VALUES
  ('Computer Science'), ('Mechanical Engineering'), ('Physics'), ('Architecture')
) AS v(dept)
WHERE u.short = 'ETH'
ON CONFLICT DO NOTHING;

INSERT INTO departments (university_id, name)
SELECT id, dept FROM universities u
CROSS JOIN (VALUES
  ('Computer Science'), ('Electrical Engineering'),
  ('Mechanical Engineering'), ('Chemical Engineering')
) AS v(dept)
WHERE u.short = 'IITB'
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA — Categories
-- ============================================================
INSERT INTO categories (name, icon, description)
VALUES
  ('Reports', 'FileText', 'Lab reports, project reports & analysis'),
  ('Assignments', 'ClipboardList', 'Completed assignments & homework'),
  ('Presentations', 'Presentation', 'Slides & decks for class'),
  ('Case Analysis', 'Scale', 'Business & legal case studies'),
  ('Lecture Notes', 'BookOpen', 'Notes taken during lectures'),
  ('Lab Reports', 'FlaskConical', 'Science & engineering lab work'),
  ('Research Papers', 'Microscope', 'Theses & academic research'),
  ('Past Papers', 'FileQuestion', 'Previous exam question papers'),
  ('Class Notes', 'NotebookPen', 'Quick class & topic notes'),
  ('Thesis', 'GraduationCap', 'Final-year thesis & dissertations'),
  ('Cheat Sheets', 'ScrollText', 'Quick reference summaries'),
  ('Study Guides', 'Map', 'Comprehensive exam prep guides')
ON CONFLICT DO NOTHING;
