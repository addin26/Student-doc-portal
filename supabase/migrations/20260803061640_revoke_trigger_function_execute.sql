/*
# Revoke public execute on trigger functions

## Changes
1. Revoke EXECUTE on `handle_new_user()` from anon and authenticated roles.
   This function should only fire via the `on_auth_user_created` trigger — it
   must not be callable directly through the REST API.
2. Revoke EXECUTE on `update_updated_at()` from anon and authenticated roles.
   This function should only fire via the `study_notes_updated_at` trigger.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated;
