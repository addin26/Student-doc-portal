/*
# Create Supabase Storage bucket for resource files

## Overview
Creates a public-read storage bucket called `resources` where uploaded study
materials (PDFs, slides, documents, images, videos, etc.) are stored. Files are
organized per-user under `resources/{user_id}/{filename}`.

## Storage Bucket
- Name: `resources`
- Public: true (anyone can download shared resources without authentication)
- Max file size: 100 MB (enforced in the upload UI)

## Storage Policies (RLS on storage.objects)
1. **public_read_resources** — anyone (anon + authenticated) can SELECT (download)
   files in the `resources` bucket. This makes shared resources publicly downloadable.
2. **insert_own_resources** — authenticated users can INSERT (upload) files only
   into their own folder: `resources/{auth.uid()}/`.
3. **update_own_resources** — authenticated users can UPDATE files only in their
   own folder.
4. **delete_own_resources** — authenticated users can DELETE files only in their
   own folder.

## Notes
1. The path pattern `resources/{auth.uid()}/...` ensures each user's files are
   isolated in their own folder. The policy checks that the file path starts with
   the authenticated user's ID.
2. The bucket is public so anyone can download resources without signing in —
   this matches the app's model where the explore page is public.
3. File type and size validation is enforced in the upload UI (client-side).
   Supabase Storage does not support server-side MIME type validation on the
   free tier, so the client checks are the first line of defense.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Public read: anyone can download resources
DROP POLICY IF EXISTS "public_read_resources" ON storage.objects;
CREATE POLICY "public_read_resources" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'resources');

-- Authenticated users can upload to their own folder
DROP POLICY IF EXISTS "insert_own_resources" ON storage.objects;
CREATE POLICY "insert_own_resources" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resources'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update files in their own folder
DROP POLICY IF EXISTS "update_own_resources" ON storage.objects;
CREATE POLICY "update_own_resources" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resources'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'resources'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete files in their own folder
DROP POLICY IF EXISTS "delete_own_resources" ON storage.objects;
CREATE POLICY "delete_own_resources" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resources'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
