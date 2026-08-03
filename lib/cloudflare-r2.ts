import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Cloudflare R2 server configuration is incomplete.');
  }

  return {
    bucketName,
    client: new S3Client({
      region: 'auto',
      endpoint:
        process.env.CLOUDFLARE_R2_ENDPOINT ||
        `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }),
  };
}

/**
 * Generate a presigned upload URL for direct client-to-R2 upload
 */
export async function getR2UploadPresignedUrl(key: string, contentType: string, expiresInSeconds = 3600): Promise<string> {
  const { client, bucketName } = getR2Config();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generate a presigned download URL for registered users
 */
export async function getR2DownloadPresignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
  const { client, bucketName } = getR2Config();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
