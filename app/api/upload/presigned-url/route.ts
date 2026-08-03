import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/api-auth';
import { apiError, apiSuccess, getRequestId } from '@/lib/api-response';
import { getR2UploadPresignedUrl } from '@/lib/cloudflare-r2';

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const allowedContentTypes = new Set([
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const requestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(150),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE),
});

function sanitizeFileName(fileName: string) {
  const safe = fileName
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .slice(-160);
  return safe || 'resource.bin';
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers.get('x-request-id'));

  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return apiError(401, 'AUTH_REQUIRED', 'Sign in to upload files.', requestId);
    }

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(400, 'INVALID_UPLOAD_METADATA', 'File name, type, or size is invalid.', requestId);
    }
    if (!allowedContentTypes.has(parsed.data.contentType)) {
      return apiError(415, 'UNSUPPORTED_FILE_TYPE', 'This file type is not supported.', requestId);
    }

    const storageKey = `resources/${auth.user.id}/${randomUUID()}-${sanitizeFileName(parsed.data.fileName)}`;
    const expiresInSeconds = 900;
    const uploadUrl = await getR2UploadPresignedUrl(
      storageKey,
      parsed.data.contentType,
      expiresInSeconds,
    );

    return apiSuccess(
      {
        uploadUrl,
        storageKey,
        storageProvider: 'r2',
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
        requiredHeaders: { 'Content-Type': parsed.data.contentType },
      },
      requestId,
    );
  } catch (error) {
    console.error('R2 upload presign failed', { requestId, error });
    return apiError(500, 'UPLOAD_SESSION_FAILED', 'Could not prepare the upload.', requestId);
  }
}
