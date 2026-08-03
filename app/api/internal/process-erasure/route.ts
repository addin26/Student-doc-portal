import { type NextRequest, NextResponse } from 'next/server';
import { deleteR2Object } from '@/lib/cloudflare-r2';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ErasureJob = { job_id: string; target_user_id: string };
type ErasureResource = {
  id: string;
  storage_provider: string;
  storage_key: string | null;
};

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

function failureCode(error: unknown) {
  if (error instanceof Error && /^[A-Z0-9_]{3,80}$/.test(error.message)) return error.message;
  return 'ACCOUNT_ERASURE_FAILED';
}

async function processNextErasure(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (process.env.ACCOUNT_ERASURE_ENABLED !== 'true') {
    return NextResponse.json({ processed: false, reason: 'disabled_by_policy' });
  }
  const supabase = createServiceRoleSupabaseClient();
  const workerId = crypto.randomUUID();
  const { data, error } = await supabase.rpc('claim_account_erasure_job', { p_worker_id: workerId });
  if (error) return NextResponse.json({ error: 'Could not claim an erasure job.' }, { status: 500 });
  const job = (Array.isArray(data) ? data[0] : data) as ErasureJob | null;
  if (!job) return NextResponse.json({ processed: false, reason: 'queue_empty' });

  try {
    const { data: resources, error: resourceError, count: resourceCount } = await supabase
      .from('resources')
      .select('id, storage_provider, storage_key', { count: 'exact' })
      .eq('uploader_id', job.target_user_id)
      .in('status', ['pending', 'rejected', 'removed'])
      .limit(25);
    if (resourceError) throw new Error('ERASURE_RESOURCE_READ_FAILED');

    for (const resource of (resources ?? []) as ErasureResource[]) {
      if (!resource.storage_key) continue;
      if (resource.storage_provider === 'r2') {
        await deleteR2Object(resource.storage_key);
      } else if (resource.storage_provider === 'supabase') {
        const bucket = process.env.SUPABASE_LEGACY_RESOURCE_BUCKET;
        if (!bucket) throw new Error('ERASURE_LEGACY_STORAGE_NOT_CONFIGURED');
        const { error: storageError } = await supabase.storage.from(bucket).remove([resource.storage_key]);
        if (storageError) throw new Error('ERASURE_LEGACY_STORAGE_DELETE_FAILED');
      } else {
        throw new Error('ERASURE_STORAGE_PROVIDER_UNSUPPORTED');
      }
    }

    const resourceIds = (resources ?? []).map((resource) => resource.id);
    if (resourceIds.length) {
      const { error: deleteResourcesError } = await supabase.from('resources').delete().in('id', resourceIds);
      if (deleteResourcesError) throw new Error('ERASURE_RESOURCE_DELETE_FAILED');
    }
    if ((resourceCount ?? 0) > resourceIds.length) throw new Error('ERASURE_MORE_RESOURCES_PENDING');
    const { error: notesError } = await supabase.from('study_notes').delete().eq('user_id', job.target_user_id);
    if (notesError) throw new Error('ERASURE_NOTES_DELETE_FAILED');

    const { error: userError } = await supabase.auth.admin.deleteUser(job.target_user_id, false);
    if (userError && !/not found/i.test(userError.message)) throw new Error('ERASURE_AUTH_DELETE_FAILED');

    const { error: completionError } = await supabase.rpc('complete_account_erasure_job', {
      p_job_id: job.job_id,
      p_worker_id: workerId,
    });
    if (completionError) throw new Error('ERASURE_COMPLETION_WRITE_FAILED');
    return NextResponse.json({ processed: true });
  } catch (error) {
    const code = failureCode(error);
    const { error: failureError } = await supabase.rpc('fail_account_erasure_job', {
      p_job_id: job.job_id,
      p_worker_id: workerId,
      p_error_code: code,
    });
    if (failureError) console.error('erasure.worker.failure_write_failed', { code: failureError.code });
    console.error('erasure.worker.failed', { code });
    return NextResponse.json({ processed: false, error: code }, { status: 502 });
  }
}

export async function GET(request: NextRequest) { return processNextErasure(request); }
export async function POST(request: NextRequest) { return processNextErasure(request); }
