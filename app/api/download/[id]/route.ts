import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/api-auth';
import { consumeApiRateLimit } from '@/lib/api-rate-limit';
import { apiError, apiSuccess, getRequestId } from '@/lib/api-response';
import { getR2DownloadPresignedUrl } from '@/lib/cloudflare-r2';

const idSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers.get('x-request-id'));
  const { id: resourceId } = await params;

  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return apiError(401, 'AUTH_REQUIRED', 'Sign in to download resources.', requestId);
    }
    if (auth.accountStatus !== 'active') {
      return apiError(403, 'ACCOUNT_RESTRICTED', 'This account cannot download resources.', requestId);
    }
    const rateLimit = await consumeApiRateLimit(auth, 'resource.download', request);
    if (!rateLimit.allowed) {
      return apiError(429, 'RATE_LIMITED', `Too many download requests. Try again in ${rateLimit.retryAfterSeconds} seconds.`, requestId);
    }
    if (!idSchema.safeParse(resourceId).success) {
      return apiError(400, 'INVALID_RESOURCE_ID', 'The resource identifier is invalid.', requestId);
    }

    const { data: resource, error: resourceError } = await auth.supabase
      .from('resources')
      .select('id, storage_key, storage_provider, title, uploader_id')
      .eq('id', resourceId)
      .maybeSingle();

    if (resourceError || !resource) {
      return apiError(404, 'RESOURCE_NOT_FOUND', 'The resource was not found.', requestId);
    }
    if (resource.storage_provider !== 'r2' || !resource.storage_key) {
      return apiError(409, 'RESOURCE_FILE_UNAVAILABLE', 'The resource file is unavailable.', requestId);
    }

    const downloadUrl = await getR2DownloadPresignedUrl(resource.storage_key, 900);
    const { error: counterError } = await auth.supabase.rpc(
      'increment_resource_downloads',
      { resource_id: resourceId },
    );
    if (counterError) {
      console.warn('Download counter update failed', {
        requestId,
        resourceId,
        code: counterError.code,
      });
    }

    return apiSuccess(
      {
        downloadUrl,
        title: resource.title,
        expiresInSeconds: 900,
      },
      requestId,
    );
  } catch (error) {
    console.error('R2 download presign failed', { requestId, error });
    return apiError(500, 'DOWNLOAD_SESSION_FAILED', 'Could not prepare the download.', requestId);
  }
}
