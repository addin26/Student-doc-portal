import { z } from 'zod';

export const uploadTypePolicy = {
  'application/pdf': ['pdf'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/zip': ['zip'],
  'application/x-zip-compressed': ['zip'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'video/mp4': ['mp4'],
  'video/webm': ['webm'],
  'video/quicktime': ['mov'],
} as const;

export type AllowedContentType = keyof typeof uploadTypePolicy;

export function getUploadMaxBytes() {
  const configured = Number(process.env.UPLOAD_MAX_BYTES);
  return Number.isInteger(configured) && configured > 0
    ? Math.min(configured, 1024 * 1024 * 1024)
    : 100 * 1024 * 1024;
}

export function fileExtension(fileName: string) {
  const normalized = fileName.normalize('NFKC').trim();
  const lastDot = normalized.lastIndexOf('.');
  return lastDot > -1 ? normalized.slice(lastDot + 1).toLowerCase() : '';
}

export function isAllowedUploadPair(fileName: string, contentType: string) {
  const allowedExtensions = uploadTypePolicy[contentType as AllowedContentType];
  return Boolean(allowedExtensions?.includes(fileExtension(fileName) as never));
}

export function resourceFileType(fileName: string) {
  const extension = fileExtension(fileName);
  if (extension === 'ppt' || extension === 'pptx') return 'ppt';
  if (extension === 'docx') return 'docx';
  if (extension === 'xls' || extension === 'xlsx') return 'xlsx';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'img';
  if (['mp4', 'webm', 'mov'].includes(extension)) return 'video';
  if (extension === 'zip') return 'zip';
  return 'pdf';
}

export const presignRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(150),
  sizeBytes: z.number().int().positive(),
  checksumSha256: z.string().regex(/^[A-Za-z0-9+/]{43}=$/).optional(),
});

export const finalizeUploadSchema = z.object({
  storageKey: z.string().min(20).max(700),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(150),
  sizeBytes: z.number().int().positive(),
  checksumSha256: z.string().regex(/^[A-Za-z0-9+/]{43}=$/).optional(),
  title: z.string().trim().min(3).max(240),
  description: z.string().trim().min(10).max(5000),
  universityId: z.string().uuid(),
  courseId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  department: z.string().trim().min(2).max(160),
  courseCode: z.string().trim().min(2).max(40),
  semester: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(2).max(160),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
});

export function keyBelongsToUser(storageKey: string, userId: string) {
  return storageKey.startsWith(`resources/${userId}/`) && !storageKey.includes('..');
}
