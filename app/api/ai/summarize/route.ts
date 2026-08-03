import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/api-auth';
import { consumeApiRateLimit } from '@/lib/api-rate-limit';
import { apiError, apiSuccess, getRequestId } from '@/lib/api-response';
import {
  isGeminiConfigured,
  summarizeDocumentText,
} from '@/lib/gemini';
import { isTrustedMutationOrigin } from '@/lib/request-security';

const requestSchema = z.object({
  documentText: z.string().trim().min(1).max(50000),
  title: z.string().trim().max(255).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers.get('x-request-id'));

  try {
    if (!isTrustedMutationOrigin(request)) return apiError(403, 'UNTRUSTED_ORIGIN', 'The request origin is not allowed.', requestId);
    const auth = await authenticateRequest(request);
    if (!auth) {
      return apiError(401, 'AUTH_REQUIRED', 'Sign in to request AI analysis.', requestId);
    }
    if (auth.accountStatus !== 'active') {
      return apiError(403, 'ACCOUNT_RESTRICTED', 'This account cannot request AI analysis.', requestId);
    }
    const rateLimit = await consumeApiRateLimit(auth, 'ai.summarize', request);
    if (!rateLimit.allowed) {
      return apiError(429, 'RATE_LIMITED', `Too many AI requests. Try again in ${rateLimit.retryAfterSeconds} seconds.`, requestId);
    }
    if (!isGeminiConfigured()) {
      return apiError(503, 'AI_NOT_CONFIGURED', 'AI analysis is not enabled.', requestId);
    }

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(400, 'INVALID_AI_REQUEST', 'Document text is required and must be within the size limit.', requestId);
    }

    const result = await summarizeDocumentText(
      parsed.data.documentText,
      parsed.data.title,
    );
    return apiSuccess(result, requestId);
  } catch (error) {
    console.error('AI analysis failed', { requestId, error });
    return apiError(502, 'AI_ANALYSIS_FAILED', 'AI analysis could not be completed.', requestId);
  }
}
