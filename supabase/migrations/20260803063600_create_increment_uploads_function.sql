/*
# Create increment_uploads function

## Overview
Creates a SECURITY DEFINER function that safely increments the upload count
and points for a user profile when they upload a resource. This is called
after a successful resource insert.

## Function
- `increment_uploads(user_id uuid)` — increments the `uploads` column by 1
  and adds 50 points to the `points` column for the given user. Returns void.
- SECURITY DEFINER so it can run with elevated privileges to update profile
  rows (though profiles are owner-writable, this ensures the increment is
  atomic and can't be tampered with by the client).
- EXECUTE revoked from anon and authenticated to prevent direct REST calls.
*/

CREATE OR REPLACE FUNCTION public.increment_uploads(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET uploads = uploads + 1,
      points = points + 50
  WHERE id = user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_uploads(uuid) FROM anon, authenticated;
