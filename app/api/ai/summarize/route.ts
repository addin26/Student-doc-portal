import { NextRequest, NextResponse } from 'next/server';
import { summarizeDocumentText } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { documentText, title } = await req.json();

    if (!documentText) {
      return NextResponse.json({ error: 'documentText parameter is required.' }, { status: 400 });
    }

    const aiResult = await summarizeDocumentText(documentText, title);

    return NextResponse.json(aiResult);
  } catch (error: any) {
    console.error('Error generating AI document summary:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate AI summary' }, { status: 500 });
  }
}
