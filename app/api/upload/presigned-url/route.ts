import { NextRequest, NextResponse } from 'next/server';
import { getR2UploadPresignedUrl } from '@/lib/cloudflare-r2';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized. Login required to upload files.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication session.' }, { status: 401 });
    }

    const { fileName, fileType, fileSize } = await req.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'fileName and fileType are required parameters.' }, { status: 400 });
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `resources/${user.id}/${Date.now()}_${sanitizedFileName}`;

    const uploadUrl = await getR2UploadPresignedUrl(storageKey, fileType);

    return NextResponse.json({
      uploadUrl,
      storageKey,
      storageProvider: 'r2',
    });
  } catch (error: any) {
    console.error('Error generating R2 presigned upload URL:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
