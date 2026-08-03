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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError(401, 'AUTH_REQUIRED', 'Sign in to view your dashboard.', requestId);

    const [profileResult, resourcesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, avatar, points, level, uploads, downloads, badge, verified, universities(name)')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('resources')
        .select(`
          id, title, description, department, course_code, semester, subject,
          file_type, file_size, size_bytes, pages, rating, rating_count,
          downloads, views, bookmarks, tags, trending, featured, premium,
          category_id, created_at, ai_summary, ai_topics, ai_status,
          universities(id, name, short), courses(id, code, title),
          categories(id, name), profiles(id, full_name, avatar, verified)
        `)
        .eq('uploader_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const firstError = profileResult.error ?? resourcesResult.error;
    if (firstError) {
      console.error('dashboard.load.failed', { requestId, code: firstError.code });
      return apiError(503, 'DASHBOARD_UNAVAILABLE', 'Your dashboard is temporarily unavailable.', requestId);
    }
    if (!profileResult.data) return apiError(404, 'PROFILE_NOT_FOUND', 'Your profile could not be found.', requestId);

    const profile = profileResult.data;
    const relation = profile.universities as UniversityRelation;
    const university = Array.isArray(relation) ? relation[0] : relation;
    const resources = (resourcesResult.data ?? []).map((row) => mapCatalogResource(row as unknown as Record<string, unknown>));
    const rated = resources.filter((resource) => resource.ratingCount > 0);
    const averageRating = rated.length
      ? rated.reduce((sum, resource) => sum + resource.rating, 0) / rated.length
      : 0;

    return apiSuccess({
      profile: {
        id: profile.id,
        name: profile.full_name,
        avatar: profile.avatar || 'SD',
        university: university?.name || 'Independent',
        points: profile.points,
        level: profile.level,
        uploads: profile.uploads,
        downloads: profile.downloads,
        badge: profile.badge,
        verified: profile.verified,
        averageRating,
      },
      resources,
    }, requestId);
  } catch {
    console.error('dashboard.load.unexpected', { requestId });
    return apiError(500, 'INTERNAL_ERROR', 'Your dashboard could not be loaded.', requestId);
  }
}
