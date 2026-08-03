import { notFound } from 'next/navigation';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import ResourceDetailClient from './resource-detail-client';

export const dynamic = 'force-dynamic';

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = z.string().uuid().safeParse((await params).id);
  if (!parsed.success) notFound();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('resources')
    .select('id')
    .eq('id', parsed.data)
    .maybeSingle();

  // RLS makes a non-visible resource indistinguishable from a missing one.
  if (!error && !data) notFound();
  return <ResourceDetailClient />;
}
