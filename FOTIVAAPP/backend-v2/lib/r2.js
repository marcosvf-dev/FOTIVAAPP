const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const ENDPOINT = process.env.R2_ENDPOINT || process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
const BUCKET   = process.env.R2_BUCKET   || process.env.B2_BUCKET   || 'fotiva-galerias';
const REGION   = process.env.R2_REGION   || 'us-east-005';

const s3 = new S3Client({
  endpoint: ENDPOINT.startsWith('http') ? ENDPOINT : `https://${ENDPOINT}`,
  region: REGION,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     || process.env.B2_APPLICATION_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.B2_APPLICATION_KEY,
  },
  forcePathStyle: true,
});

// CORRIGIDO: antes fazia 3 uploads do mesmo buffer. Agora faz 1 único upload.
async function uploadPhoto(buffer, mimeType, path) {
  const buf = Buffer.from(buffer);
  const ct  = mimeType || 'image/jpeg';
  const key = `${path}_original`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buf,
    ContentType: ct,
    ContentLength: buf.length,
  }));

  return {
    originalKey: key,
    fullKey: key,   // compat com código antigo
    thumbKey: key,  // compat com código antigo
    width: null,
    height: null,
    size: buf.length,
  };
}

async function uploadPhotoWithWatermark(buffer, mimeType, path, watermarkText) {
  return uploadPhoto(buffer, mimeType, path);
}

async function getSignedPhotoUrl(key, expiresIn = 86400, filename = null) {
  const params = { Bucket: BUCKET, Key: key };
  if (filename) {
    params.ResponseContentDisposition = `attachment; filename="${encodeURIComponent(filename)}"`;
  }
  return getSignedUrl(s3, new GetObjectCommand(params), { expiresIn });
}

async function deleteFile(key) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {}
}

async function deleteGalleryFiles(prefix) {
  try {
    const list = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));
    if (list.Contents?.length) {
      await Promise.all(list.Contents.map(o => deleteFile(o.Key)));
    }
  } catch {}
}

module.exports = { uploadPhoto, uploadPhotoWithWatermark, getSignedPhotoUrl, deleteFile, deleteGalleryFiles };
