import 'server-only';
import type { AuthenticatedRequest } from '@/lib/api-auth';
import type { NextRequest } from 'next/server';
import { getRateLimitIpHash } from '@/lib/request-security';

export type RateLimitedAction =
  | 'upload.presign'
  | 'upload.finalize'
  | 'resource.download'
  | 'ai.summarize';

export async function consumeApiRateLimit(
  auth: AuthenticatedRequest,
  action: RateLimitedAction,
  request: NextRequest,
) {
  const { data, error } = await auth.supabase.rpc('consume_api_rate_limit_v2', {
    p_action: action,
    p_ip_hash: getRateLimitIpHash(request),
  });
  if (error) throw new Error(`Rate limit check failed: ${error.code}`);
  const value = Array.isArray(data) ? data[0] : data;
  return {
    allowed: value?.allowed === true,
    retryAfterSeconds: Number(value?.retry_after_seconds ?? 60),
    remaining: Number(value?.remaining ?? 0),
  };
}
