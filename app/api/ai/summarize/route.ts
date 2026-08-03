import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/api-auth';
import { apiError, apiSuccess, getRequestId } from '@/lib/api-response';
import {
  isGeminiConfigured,
  summarizeDocumentText,
} from '@/lib/gemini';

const requestSchema = z.object({
  documentText: z.string().trim().min(1).max(50000),
  title: z.string().trim().max(255).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers.get('x-request-id'));

  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return apiError(401, 'AUTH_REQUIRED', 'Sign in to request AI analysis.', requestId);
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
