import 'server-only';

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

export type AuthenticatedRequest = {
  token: string;
  user: User;
  supabase: SupabaseClient;
};

export async function authenticateRequest(
  request: NextRequest,
): Promise<AuthenticatedRequest | null> {
  const authorization = request.headers.get('authorization');
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase server configuration is incomplete.');

  const token = match[1];
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return { token, user, supabase };
}
