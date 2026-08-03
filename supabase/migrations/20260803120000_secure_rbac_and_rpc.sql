/*
  Phase 1 security correction for STUDYDOCK.

  - Adds a reusable server-side admin predicate.
  - Prevents users from updating protected profile columns.
  - Restricts university/course proposals to custom_pending.
  - Adds explicit admin RLS policies.
  - Secures SECURITY DEFINER merge/counter functions.
  - Moves upload rewards to a database trigger so clients cannot self-award XP.
*/

-- ---------------------------------------------------------------------------
-- Admin predicate
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role = 'admin'::public.user_role
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- Profiles: users may edit only explicitly granted self-service columns.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = id
  AND role = 'user'::public.user_role
  AND points = 0
  AND level = 1
  AND uploads = 0
  AND downloads = 0
  AND badge = 'Newbie'
  AND verified = false
);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "admin_manage_profiles" ON public.profiles;
CREATE POLICY "admin_manage_profiles"
ON public.profiles
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar, university_id) ON public.profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- Proposal and admin policies for shared reference data.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "authenticated_propose_universities" ON public.universities;
CREATE POLICY "authenticated_propose_universities"
ON public.universities
FOR INSERT
TO authenticated
WITH CHECK (status = 'custom_pending'::public.record_status);

DROP POLICY IF EXISTS "admin_manage_universities" ON public.universities;
CREATE POLICY "admin_manage_universities"
ON public.universities
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "authenticated_insert_courses" ON public.courses;
DROP POLICY IF EXISTS "authenticated_propose_courses" ON public.courses;
CREATE POLICY "authenticated_propose_courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (status = 'custom_pending'::public.record_status);

DROP POLICY IF EXISTS "admin_manage_courses" ON public.courses;
CREATE POLICY "admin_manage_courses"
ON public.courses
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "admin_manage_departments" ON public.departments;
CREATE POLICY "admin_manage_departments"
ON public.departments
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "admin_manage_subjects" ON public.subjects;
CREATE POLICY "admin_manage_subjects"
ON public.subjects
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "admin_manage_categories" ON public.categories;
CREATE POLICY "admin_manage_categories"
ON public.categories
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "admin_manage_resources" ON public.resources;
CREATE POLICY "admin_manage_resources"
ON public.resources
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- ---------------------------------------------------------------------------
-- Upload counters are awarded by the database, not a caller-controlled RPC.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.increment_uploads(uuid);

CREATE OR REPLACE FUNCTION public.handle_resource_insert_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.uploader_id IS NOT NULL THEN
    UPDATE public.profiles
    SET uploads = uploads + 1,
        points = points + 50
    WHERE id = NEW.uploader_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_resource_insert_counters() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS resource_insert_counters ON public.resources;
CREATE TRIGGER resource_insert_counters
AFTER INSERT ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.handle_resource_insert_counters();

CREATE OR REPLACE FUNCTION public.increment_resource_downloads(resource_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.resources
  SET downloads = downloads + 1
  WHERE id = resource_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource not found.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_resource_downloads(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_resource_downloads(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Secured merge functions. Collision-aware merge v2 and auditing follow in
-- Phase 2; these definitions immediately close the privilege-escalation gap.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.merge_universities(
  source_univ_id uuid,
  target_univ_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'Administrator access required.' USING ERRCODE = '42501';
  END IF;

  IF source_univ_id = target_univ_id THEN
    RAISE EXCEPTION 'Source and target university cannot be identical.';
  END IF;

  PERFORM 1 FROM public.universities WHERE id = source_univ_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source university not found.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1 FROM public.universities WHERE id = target_univ_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target university not found.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.departments SET university_id = target_univ_id WHERE university_id = source_univ_id;
  UPDATE public.subjects SET university_id = target_univ_id WHERE university_id = source_univ_id;
  UPDATE public.courses SET university_id = target_univ_id WHERE university_id = source_univ_id;
  UPDATE public.profiles SET university_id = target_univ_id WHERE university_id = source_univ_id;
  UPDATE public.resources SET university_id = target_univ_id WHERE university_id = source_univ_id;

  UPDATE public.universities
  SET departments_count = (
    SELECT count(*)::integer
    FROM public.departments
    WHERE university_id = target_univ_id
  )
  WHERE id = target_univ_id;

  DELETE FROM public.universities WHERE id = source_univ_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_courses(
  source_course_id uuid,
  target_course_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  source_university_id uuid;
  target_university_id uuid;
BEGIN
  IF NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'Administrator access required.' USING ERRCODE = '42501';
  END IF;

  IF source_course_id = target_course_id THEN
    RAISE EXCEPTION 'Source and target course cannot be identical.';
  END IF;

  SELECT university_id INTO source_university_id
  FROM public.courses
  WHERE id = source_course_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source course not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT university_id INTO target_university_id
  FROM public.courses
  WHERE id = target_course_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target course not found.' USING ERRCODE = 'P0002';
  END IF;

  IF source_university_id <> target_university_id THEN
    RAISE EXCEPTION 'Courses from different universities cannot be merged.';
  END IF;

  UPDATE public.resources SET course_id = target_course_id WHERE course_id = source_course_id;
  DELETE FROM public.courses WHERE id = source_course_id;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_universities(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.merge_courses(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_universities(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_courses(uuid, uuid) TO authenticated;

-- Search is intentionally callable by visitors; RLS on resources remains the
-- row-visibility boundary until the moderation lifecycle migration is applied.
REVOKE ALL ON FUNCTION public.search_resources_intelligent(text, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_resources_intelligent(text, uuid, uuid, uuid) TO anon, authenticated;
