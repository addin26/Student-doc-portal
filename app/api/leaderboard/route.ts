import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, getRequestId } from '@/lib/api-response';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(3).max(50).default(20),
});

type UniversityRelation = { name?: string } | { name?: string }[] | null;

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers.get('x-request-id'));
  const parsed = paginationSchema.safeParse({
    page: request.nextUrl.searchParams.get('page') ?? 1,
    pageSize: request.nextUrl.searchParams.get('pageSize') ?? 20,
  });
  if (!parsed.success) return apiError(400, 'INVALID_PAGE', 'Leaderboard pagination is invalid.', requestId);

  try {
    const from = (parsed.data.page - 1) * parsed.data.pageSize;
    const to = from + parsed.data.pageSize - 1;
    const supabase = await createServerSupabaseClient();
    const { data, count, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar, points, level, uploads, downloads, badge, verified, universities(name)', { count: 'exact' })
      .order('points', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to);
    if (error) {
      console.error('leaderboard.list.failed', { requestId, code: error.code });
      return apiError(503, 'LEADERBOARD_UNAVAILABLE', 'Leaderboard is temporarily unavailable.', requestId);
    }

    const total = count ?? 0;
    const totalPages = total ? Math.ceil(total / parsed.data.pageSize) : 0;
    const contributors = (data ?? []).map((profile, index) => {
      const relation = profile.universities as UniversityRelation;
      const university = Array.isArray(relation) ? relation[0] : relation;
      return {
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
        rank: from + index + 1,
      };
    });

    return apiSuccess({ contributors, page: parsed.data.page, pageSize: parsed.data.pageSize, total, totalPages, hasMore: parsed.data.page < totalPages }, requestId);
  } catch {
    console.error('leaderboard.list.unexpected', { requestId });
    return apiError(500, 'INTERNAL_ERROR', 'Leaderboard could not be loaded.', requestId);
  }
}
