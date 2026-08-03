import { z } from 'zod';
import type { FileType, Resource } from '@/lib/catalog-types';

export const resourceSearchSchema = z.object({
  query: z.string().trim().max(120).default(''),
  universityId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  fileType: z.enum(['pdf', 'ppt', 'docx', 'zip', 'img', 'xlsx', 'video']).optional(),
  sort: z.enum(['trending', 'newest', 'downloads', 'rating']).default('trending'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(18),
});

export type ResourceSearchInput = z.infer<typeof resourceSearchSchema>;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (Array.isArray(value)) {
    return asRecord(value[0]);
  }

  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function booleanValue(value: unknown) {
  return value === true;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function normalizeFileType(value: unknown): FileType {
  const normalized = stringValue(value).toLowerCase();
  if (normalized === 'pptx') return 'ppt';
  if (normalized === 'doc') return 'docx';
  if (normalized === 'xls') return 'xlsx';
  if (normalized === 'jpg' || normalized === 'jpeg' || normalized === 'png' || normalized === 'webp') {
    return 'img';
  }
  if (normalized === 'mp4') return 'video';
  if (['pdf', 'ppt', 'docx', 'zip', 'img', 'xlsx', 'video'].includes(normalized)) {
    return normalized as FileType;
  }
  return 'pdf';
}

export function formatBytes(sizeBytes: unknown, legacySize: unknown) {
  const bytes = numberValue(sizeBytes, 0);
  if (bytes <= 0) return stringValue(legacySize, 'Size unavailable');

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function mapCatalogResource(row: UnknownRecord): Resource {
  const university = asRecord(row.universities);
  const course = asRecord(row.courses);
  const category = asRecord(row.categories);
  const profile = asRecord(row.profiles);
  const sizeBytes = numberValue(row.size_bytes, 0) || null;
  const createdAt = stringValue(row.created_at, new Date(0).toISOString());

  return {
    id: stringValue(row.id),
    title: stringValue(row.title, 'Untitled resource'),
    description: stringValue(row.description, 'No description provided.'),
    university: stringValue(row.university_name, stringValue(university?.name, 'Independent')),
    universityShort: stringValue(row.university_short, stringValue(university?.short, 'N/A')),
    department: stringValue(row.department, 'Not specified'),
    courseCode: stringValue(
      row.course_code,
      stringValue(course?.code, stringValue(row.legacy_course_code, 'N/A')),
    ),
    courseTitle: stringValue(row.course_title, stringValue(course?.title)) || undefined,
    semester: stringValue(row.semester, 'Not specified'),
    subject: stringValue(row.subject, stringValue(course?.title, 'General')),
    fileType: normalizeFileType(row.file_type),
    fileSize: formatBytes(sizeBytes, row.file_size),
    sizeBytes,
    pages: numberValue(row.pages, 0) || undefined,
    uploader: stringValue(row.uploader_name, stringValue(profile?.full_name, 'StudyDock contributor')),
    uploaderAvatar: stringValue(row.uploader_avatar, stringValue(profile?.avatar, 'SD')),
    uploaderVerified: booleanValue(row.uploader_verified ?? profile?.verified),
    rating: numberValue(row.rating),
    ratingCount: numberValue(row.rating_count),
    downloads: numberValue(row.downloads),
    views: numberValue(row.views),
    bookmarks: numberValue(row.bookmarks),
    comments: 0,
    tags: stringArray(row.tags),
    uploadDate: createdAt,
    trending: booleanValue(row.trending),
    featured: booleanValue(row.featured),
    premium: booleanValue(row.premium),
    category: stringValue(row.category_id, stringValue(category?.id)),
    categoryName: stringValue(row.category_name, stringValue(category?.name)) || undefined,
    aiSummary: stringValue(row.ai_summary) || null,
    aiTopics: stringArray(row.ai_topics),
    aiStatus: typeof row.ai_status === 'string' ? ResourceAiStatusSchema.catch('not_requested').parse(row.ai_status) : undefined,
  };
}

const ResourceAiStatusSchema = z.enum([
  'not_requested',
  'queued',
  'processing',
  'completed',
  'failed',
]);

export function searchInputFromUrl(searchParams: URLSearchParams): ResourceSearchInput {
  const optional = (key: string) => {
    const value = searchParams.get(key)?.trim();
    return value && value !== 'all' ? value : undefined;
  };

  return resourceSearchSchema.parse({
    query: searchParams.get('q') ?? '',
    universityId: optional('university'),
    courseId: optional('course'),
    categoryId: optional('category'),
    fileType: optional('fileType'),
    sort: searchParams.get('sort') ?? 'trending',
    page: searchParams.get('page') ?? 1,
    pageSize: searchParams.get('pageSize') ?? 18,
  });
}
