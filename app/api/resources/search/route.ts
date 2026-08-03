import { type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { apiError, apiSuccess, getRequestId } from '@/lib/api-response';
import { mapCatalogResource, searchInputFromUrl } from '@/lib/catalog';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers.get('x-request-id'));

  try {
    const input = searchInputFromUrl(request.nextUrl.searchParams);
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc('search_resources_v2', {
      query_text: input.query,
      university_filter: input.universityId ?? null,
      course_filter: input.courseId ?? null,
      category_filter: input.categoryId ?? null,
      file_type_filter: input.fileType ?? null,
      sort_by: input.sort,
      page_number: input.page,
      page_size: input.pageSize,
    });

    if (error) {
      console.error('catalog.search.failed', { requestId, code: error.code });
      return apiError(503, 'CATALOG_UNAVAILABLE', 'Resource search is temporarily unavailable.', requestId);
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / input.pageSize);

    return apiSuccess(
      {
        resources: rows.map(mapCatalogResource),
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages,
        hasMore: input.page < totalPages,
      },
      requestId,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, 'INVALID_SEARCH', 'One or more search parameters are invalid.', requestId);
    }

    console.error('catalog.search.unexpected', { requestId });
    return apiError(500, 'INTERNAL_ERROR', 'Resource search could not be completed.', requestId);
  }
}
