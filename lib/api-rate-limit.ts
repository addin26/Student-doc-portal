import 'server-only';
import type { AuthenticatedRequest } from '@/lib/api-auth';

export type RateLimitedAction =
  | 'upload.presign'
  | 'upload.finalize'
  | 'resource.download'
  | 'ai.summarize';

export async function consumeApiRateLimit(
  auth: AuthenticatedRequest,
  action: RateLimitedAction,
) {
  const { data, error } = await auth.supabase.rpc('consume_api_rate_limit', {
    p_action: action,
  });
  if (error) throw new Error(`Rate limit check failed: ${error.code}`);
  const value = Array.isArray(data) ? data[0] : data;
  return {
    allowed: value?.allowed === true,
    retryAfterSeconds: Number(value?.retry_after_seconds ?? 60),
    remaining: Number(value?.remaining ?? 0),
  };
}
