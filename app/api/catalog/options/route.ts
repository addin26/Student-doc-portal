import { type NextRequest } from 'next/server';
import { apiError, apiSuccess, getRequestId } from '@/lib/api-response';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers.get('x-request-id'));

  try {
    const supabase = await createServerSupabaseClient();
    const [universitiesResult, coursesResult, categoriesResult] = await Promise.all([
      supabase.from('universities').select('id, name, short').order('name').limit(1000),
      supabase.from('courses').select('id, code, title, university_id').order('code').limit(2000),
      supabase.from('categories').select('id, name').order('name').limit(250),
    ]);

    const firstError = universitiesResult.error ?? coursesResult.error ?? categoriesResult.error;
    if (firstError) {
      console.error('catalog.options.failed', { requestId, code: firstError.code });
      return apiError(503, 'CATALOG_UNAVAILABLE', 'Filter options are temporarily unavailable.', requestId);
    }

    return apiSuccess(
      {
        universities: (universitiesResult.data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          short: item.short,
        })),
        courses: (coursesResult.data ?? []).map((item) => ({
          id: item.id,
          name: item.title,
          code: item.code,
          universityId: item.university_id,
        })),
        categories: categoriesResult.data ?? [],
      },
      requestId,
    );
  } catch {
    console.error('catalog.options.unexpected', { requestId });
    return apiError(500, 'INTERNAL_ERROR', 'Filter options could not be loaded.', requestId);
  }
}
