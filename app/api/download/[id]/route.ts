import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/api-auth';
import { apiError, apiSuccess, getRequestId } from '@/lib/api-response';
import { getR2DownloadPresignedUrl } from '@/lib/cloudflare-r2';

const idSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const requestId = getRequestId(request.headers.get('x-request-id'));

  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return apiError(401, 'AUTH_REQUIRED', 'Sign in to download resources.', requestId);
    }
    if (!idSchema.safeParse(params.id).success) {
      return apiError(400, 'INVALID_RESOURCE_ID', 'The resource identifier is invalid.', requestId);
    }

    const { data: resource, error: resourceError } = await auth.supabase
      .from('resources')
      .select('id, storage_key, storage_provider, title, uploader_id')
      .eq('id', params.id)
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
      { resource_id: params.id },
    );
    if (counterError) {
      console.warn('Download counter update failed', {
        requestId,
        resourceId: params.id,
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
