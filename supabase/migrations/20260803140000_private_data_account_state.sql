/*
  Tighten private-owner reads and resource mutations by account state without
  changing the checksum of the previously published lifecycle migration.

  Active users may read and mutate their private data. Suspended users may
  read existing private data for appeal/export but may not mutate it. Deleted
  users receive neither private reads nor protected mutations.
*/

CREATE OR REPLACE FUNCTION public.can_read_private_account_data()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND account_status IN ('active'::public.account_status, 'suspended'::public.account_status)
  );
$$;

REVOKE ALL ON FUNCTION public.can_read_private_account_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_private_account_data() TO authenticated;

DROP POLICY IF EXISTS "owner_read_proposed_universities" ON public.universities;
CREATE POLICY "owner_read_proposed_universities"
ON public.universities
FOR SELECT
TO authenticated
USING (
  proposed_by = (SELECT auth.uid())
  AND (SELECT public.can_read_private_account_data())
);

DROP POLICY IF EXISTS "owner_read_proposed_courses" ON public.courses;
CREATE POLICY "owner_read_proposed_courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
  proposed_by = (SELECT auth.uid())
  AND (SELECT public.can_read_private_account_data())
);

DROP POLICY IF EXISTS "owner_read_resources" ON public.resources;
CREATE POLICY "owner_read_resources"
ON public.resources
FOR SELECT
TO authenticated
USING (
  uploader_id = (SELECT auth.uid())
  AND (SELECT public.can_read_private_account_data())
);

DROP POLICY IF EXISTS "update_own_resources" ON public.resources;
CREATE POLICY "update_own_resources"
ON public.resources
FOR UPDATE
TO authenticated
USING (
  uploader_id = (SELECT auth.uid())
  AND (SELECT public.is_active_user())
)
WITH CHECK (
  uploader_id = (SELECT auth.uid())
  AND (SELECT public.is_active_user())
);

DROP POLICY IF EXISTS "select_own_study_notes" ON public.study_notes;
CREATE POLICY "select_own_study_notes"
ON public.study_notes
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND (SELECT public.can_read_private_account_data())
);
