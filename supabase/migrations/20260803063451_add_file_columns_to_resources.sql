/*
# Add file storage columns to resources table

## Changes
1. Add `file_path` (text) — the storage path within the `resources` bucket
   (e.g. "{user-id}/{filename}"). Used to generate signed or public URLs.
2. Add `file_url` (text) — the public download URL for the uploaded file.

Both columns are nullable since existing seed/demo resources don't have files
in storage yet. New uploads will populate them.
*/

ALTER TABLE resources ADD COLUMN IF NOT EXISTS file_path text;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS file_url text;
