import { NextRequest, NextResponse } from 'next/server';
import { getR2DownloadPresignedUrl } from '@/lib/cloudflare-r2';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const resourceId = params.id;
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required. Registration/login is required to download content.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session. Please sign in to download.' }, { status: 401 });
    }

    // Fetch resource storage key from database
    const { data: resource, error: dbError } = await supabase
      .from('resources')
      .select('id, storage_key, storage_provider, title')
      .eq('id', resourceId)
      .single();

    if (dbError || !resource) {
      return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
    }

    if (!resource.storage_key) {
      return NextResponse.json({ error: 'File path unavailable for this resource.' }, { status: 404 });
    }

    // Increment download counter
    await supabase.rpc('increment_resource_downloads', { resource_id: resourceId });

    // Generate 15-minute presigned download URL from Cloudflare R2
    const downloadUrl = await getR2DownloadPresignedUrl(resource.storage_key, 900);

    return NextResponse.json({
      downloadUrl,
      title: resource.title,
      expiresInSeconds: 900,
    });
  } catch (error: any) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
