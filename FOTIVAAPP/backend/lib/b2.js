const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const B2_ENDPOINT = process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
const B2_BUCKET   = process.env.B2_BUCKET   || 'fotiva-galerias';

const s3 = new S3Client({
  endpoint: `https://${B2_ENDPOINT}`,
  region: 'us-east-005',
  credentials: {
    accessKeyId:     process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APP_KEY,
  },
  forcePathStyle: true,
});

// Upload com compressão (usa sharp se disponível)
async function uploadPhoto(buffer, mimeType, path) {
  let full = buffer, thumb = buffer, width, height;

  try {
    const sharp = require('sharp');
    const meta = await sharp(buffer).metadata();
    width  = meta.width;
    height = meta.height;
    full  = await sharp(buffer).resize({ width:2400, height:2400, fit:'inside', withoutEnlargement:true }).webp({ quality:88 }).toBuffer();
    thumb = await sharp(buffer).resize({ width:400,  height:400,  fit:'cover' }).webp({ quality:75 }).toBuffer();
  } catch { /* sem sharp, usa original */ }

  const fullKey  = `${path}.webp`;
  const thumbKey = `${path}_thumb.webp`;

  await Promise.all([
    s3.send(new PutObjectCommand({ Bucket:B2_BUCKET, Key:fullKey,  Body:full,  ContentType:'image/webp' })),
    s3.send(new PutObjectCommand({ Bucket:B2_BUCKET, Key:thumbKey, Body:thumb, ContentType:'image/webp' })),
  ]);

  return { fullKey, thumbKey, width, height, size: full.length };
}

// URL assinada válida por 24h
async function getSignedPhotoUrl(key, expiresIn = 86400) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket:B2_BUCKET, Key:key }), { expiresIn });
}

// Deleta arquivo
async function deleteFile(key) {
  try { await s3.send(new DeleteObjectCommand({ Bucket:B2_BUCKET, Key:key })); } catch {}
}

// Deleta galeria inteira
async function deleteGalleryFiles(prefix) {
  try {
    const list = await s3.send(new ListObjectsV2Command({ Bucket:B2_BUCKET, Prefix:prefix }));
    if (list.Contents?.length)
      await Promise.all(list.Contents.map(o => deleteFile(o.Key)));
  } catch {}
}

module.exports = { uploadPhoto, getSignedPhotoUrl, deleteFile, deleteGalleryFiles };
