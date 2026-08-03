import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase public configuration is incomplete.');
  }

  return { url, anonKey };
}

export function createServerSupabaseClient() {
  const { url, anonKey } = getSupabaseEnvironment();
  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. The root middleware
          // refreshes sessions and applies the response cookies instead.
        }
      },
    },
  });
}
