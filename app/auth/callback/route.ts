import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSafeRedirectPath } from '@/lib/safe-redirect';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = getSafeRedirectPath(
    request.nextUrl.searchParams.get('next'),
    '/dashboard',
  );

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const errorUrl = new URL('/auth', request.url);
  errorUrl.searchParams.set(
    'error',
    'The authentication link is invalid or has expired. Please try again.',
  );
  return NextResponse.redirect(errorUrl);
}
