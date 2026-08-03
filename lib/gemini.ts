import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface AISummaryResult {
  summary: string;
  keyTopics: string[];
  suggestedTags: string[];
  readingTimeMinutes: number;
}

/**
 * Summarize academic document text using Gemini Flash model
 */
export async function summarizeDocumentText(documentText: string, title?: string): Promise<AISummaryResult> {
  if (!GEMINI_API_KEY) {
    return {
      summary: 'AI summary unavailable (GEMINI_API_KEY not configured).',
      keyTopics: ['Academic Study'],
      suggestedTags: ['study-material'],
      readingTimeMinutes: 5,
    };
  }

  try {
    // Choose cheap fast model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert academic AI assistant for university students.
Analyze the following document text from study material${title ? ` titled "${title}"` : ''}.
Return a strict JSON object with the following fields:
{
  "summary": "Concise 3-sentence executive summary of what this study document covers",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "readingTimeMinutes": estimated_integer_minutes
}

Document Content Snippet:
${documentText.slice(0, 10000)}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Clean JSON block formatting if returned in markdown ```json ... ```
    const cleanedJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJsonText) as AISummaryResult;

    return {
      summary: parsed.summary || 'Summary unavailable.',
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
      suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
      readingTimeMinutes: typeof parsed.readingTimeMinutes === 'number' ? parsed.readingTimeMinutes : 5,
    };
  } catch (error) {
    console.error('Error generating Gemini AI document summary:', error);
    return {
      summary: 'Failed to generate AI summary for this document.',
      keyTopics: ['General'],
      suggestedTags: ['study-notes'],
      readingTimeMinutes: 5,
    };
  }
}
