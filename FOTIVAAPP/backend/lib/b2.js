const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const B2_ENDPOINT = process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
const B2_BUCKET   = process.env.B2_BUCKET   || 'fotiva-galerias';

const s3 = new S3Client({
  endpoint: `https://${B2_ENDPOINT}`,
  region: 'us-east-005',
  credentials: {
    accessKeyId:     process.env.B2_APPLICATION_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
  forcePathStyle: true,
});

async function uploadPhoto(buffer, mimeType, path) {
  const buf = Buffer.from(buffer);
  const ct  = mimeType || 'image/jpeg';
  const fullKey     = `${path}_full`;
  const thumbKey    = `${path}_thumb`;
  const originalKey = `${path}_original`;
  await Promise.all([
    s3.send(new PutObjectCommand({ Bucket:B2_BUCKET, Key:fullKey,     Body:buf, ContentType:ct, ContentLength:buf.length })),
    s3.send(new PutObjectCommand({ Bucket:B2_BUCKET, Key:thumbKey,    Body:buf, ContentType:ct, ContentLength:buf.length })),
    s3.send(new PutObjectCommand({ Bucket:B2_BUCKET, Key:originalKey, Body:buf, ContentType:ct, ContentLength:buf.length })),
  ]);
  return { fullKey, thumbKey, originalKey, width:null, height:null, size:buf.length };
}

// Marca d'água é aplicada no frontend via CSS — sem processamento no servidor
async function uploadPhotoWithWatermark(buffer, mimeType, path, watermarkText) {
  return uploadPhoto(buffer, mimeType, path);
}

// expiresIn em segundos. filename opcional — quando fornecido força download direto.
async function getSignedPhotoUrl(key, expiresIn = 86400, filename = null) {
  const params = { Bucket: B2_BUCKET, Key: key };
  if (filename) {
    params.ResponseContentDisposition = `attachment; filename="${encodeURIComponent(filename)}"`;
  }
  return getSignedUrl(s3, new GetObjectCommand(params), { expiresIn });
}

async function deleteFile(key) {
  try { await s3.send(new DeleteObjectCommand({ Bucket:B2_BUCKET, Key:key })); } catch {}
}

async function deleteGalleryFiles(prefix) {
  try {
    const list = await s3.send(new ListObjectsV2Command({ Bucket:B2_BUCKET, Prefix:prefix }));
    if (list.Contents?.length)
      await Promise.all(list.Contents.map(o => deleteFile(o.Key)));
  } catch {}
}

module.exports = { uploadPhoto, uploadPhotoWithWatermark, getSignedPhotoUrl, deleteFile, deleteGalleryFiles };
