import { type NextRequest } from 'next/server';
import { apiError, apiSuccess, getRequestId } from '@/lib/api-response';
import { mapCatalogResource } from '@/lib/catalog';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type UniversityRelation = { name?: string } | { name?: string }[] | null;

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers.get('x-request-id'));
  try {
    const supabase = await createServerSupabaseClient();
    const [resourcesResult, universitiesResult, categoriesResult, contributorsResult, statsResult] = await Promise.all([
      supabase.rpc('search_resources_v2', {
        query_text: '', university_filter: null, course_filter: null,
        category_filter: null, file_type_filter: null, sort_by: 'trending',
        page_number: 1, page_size: 6,
      }),
      supabase.rpc('list_universities_v2', { query_text: '', page_number: 1, page_size: 6 }),
      supabase.rpc('list_categories_v2'),
      supabase.from('profiles').select('id, full_name, avatar, points, level, uploads, downloads, badge, verified, universities(name)').order('points', { ascending: false }).order('id').limit(5),
      supabase.rpc('public_platform_stats'),
    ]);
    const firstError = resourcesResult.error ?? universitiesResult.error ?? categoriesResult.error ?? contributorsResult.error ?? statsResult.error;
    if (firstError) {
      console.error('home.overview.failed', { requestId, code: firstError.code });
      return apiError(503, 'HOME_UNAVAILABLE', 'Live platform information is temporarily unavailable.', requestId);
    }

    const contributors = (contributorsResult.data ?? []).map((profile, index) => {
      const relation = profile.universities as UniversityRelation;
      const university = Array.isArray(relation) ? relation[0] : relation;
      return {
        id: profile.id, name: profile.full_name, avatar: profile.avatar || 'SD',
        university: university?.name || 'Independent', points: profile.points,
        level: profile.level, uploads: profile.uploads, downloads: profile.downloads,
        badge: profile.badge, verified: profile.verified, rank: index + 1,
      };
    });

    return apiSuccess({
      resources: ((resourcesResult.data ?? []) as Record<string, unknown>[]).map(mapCatalogResource),
      universities: ((universitiesResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id), name: String(row.name), short: String(row.short),
        country: String(row.country), color: typeof row.color === 'string' && row.color ? row.color : 'from-primary to-secondary',
        departments: Number(row.departments_count ?? 0), resources: Number(row.resource_count ?? 0),
        contributors: Number(row.contributor_count ?? 0),
      })),
      categories: ((categoriesResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id), name: String(row.name), icon: typeof row.icon === 'string' ? row.icon : 'FileText',
        description: typeof row.description === 'string' ? row.description : '', count: Number(row.resource_count ?? 0),
      })),
      contributors,
      stats: statsResult.data ?? { resources: 0, students: 0, universities: 0, downloads: 0 },
    }, requestId);
  } catch {
    console.error('home.overview.unexpected', { requestId });
    return apiError(500, 'INTERNAL_ERROR', 'Live platform information could not be loaded.', requestId);
  }
}
