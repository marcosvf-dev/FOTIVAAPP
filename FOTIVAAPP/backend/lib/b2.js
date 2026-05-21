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

// Upload com compressão (usa sharp se disponível)
// Salva 3 versões: original (download), full webp (galeria), thumb webp (preview)
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

  const fullKey     = `${path}.webp`;
  const thumbKey    = `${path}_thumb.webp`;
  const originalKey = `${path}_original`;
  const originalContentType = mimeType || 'image/jpeg';

  const fullBuf2     = Buffer.from(full);
  const thumbBuf2    = Buffer.from(thumb);
  const originalBuf2 = Buffer.from(buffer);

  await Promise.all([
    s3.send(new PutObjectCommand({ Bucket:B2_BUCKET, Key:fullKey,     Body:fullBuf2,     ContentType:'image/webp',         ContentLength: fullBuf2.length })),
    s3.send(new PutObjectCommand({ Bucket:B2_BUCKET, Key:thumbKey,    Body:thumbBuf2,    ContentType:'image/webp',         ContentLength: thumbBuf2.length })),
    s3.send(new PutObjectCommand({ Bucket:B2_BUCKET, Key:originalKey, Body:originalBuf2, ContentType:originalContentType,  ContentLength: originalBuf2.length })),
  ]);

  return { fullKey, thumbKey, originalKey, width, height, size: full.length };
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

// Upload com marca d'água em texto
async function uploadPhotoWithWatermark(buffer, mimeType, path, watermarkText) {
  let full = buffer, thumb = buffer, width, height;

  try {
    const sharp = require('sharp');
    const meta  = await sharp(buffer).metadata();
    width  = meta.width;
    height = meta.height;

    const resized = await sharp(buffer)
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    const resizedMeta = await sharp(resized).metadata();
    const fontSize    = Math.max(24, Math.round(resizedMeta.width * 0.04));
    const svgText     = `<svg width="${resizedMeta.width}" height="${resizedMeta.height}">
      <text x="50%" y="95%" text-anchor="middle" font-size="${fontSize}"
        font-family="Arial" fill="rgba(255,255,255,0.55)"
        stroke="rgba(0,0,0,0.3)" stroke-width="1">${watermarkText}</text>
    </svg>`;

    full = await sharp(resized)
      .composite([{ input: Buffer.from(svgText), blend: 'over' }])
      .webp({ quality: 88 })
      .toBuffer();

    thumb = await sharp(buffer)
      .resize({ width: 400, height: 400, fit: 'cover' })
      .composite([{ input: Buffer.from(svgText.replace(`width="${resizedMeta.width}" height="${resizedMeta.height}"`, 'width="400" height="400"')), blend: 'over' }])
      .webp({ quality: 75 })
      .toBuffer();
  } catch (e) {
    console.warn('Sharp watermark falhou, usando original:', e.message);
    full  = buffer;
    thumb = buffer;
  }

  const fullKey          = `${path}.webp`;
  const thumbKey         = `${path}_thumb.webp`;
  const originalKey      = `${path}_original`;
  const originalContentType = mimeType || 'image/jpeg';

  // Garante que nenhum buffer está vazio antes de enviar
  if (!full?.length || !thumb?.length || !buffer?.length) {
    throw new Error('Buffer de imagem inválido ou vazio');
  }

  // Força Buffer Node.js puro e envia ContentLength explícito
  const fullBuf     = Buffer.from(full);
  const thumbBuf    = Buffer.from(thumb);
  const originalBuf = Buffer.from(buffer);

  await Promise.all([
    s3.send(new PutObjectCommand({ Bucket: B2_BUCKET, Key: fullKey,     Body: fullBuf,     ContentType: 'image/webp',          ContentLength: fullBuf.length })),
    s3.send(new PutObjectCommand({ Bucket: B2_BUCKET, Key: thumbKey,    Body: thumbBuf,    ContentType: 'image/webp',          ContentLength: thumbBuf.length })),
    s3.send(new PutObjectCommand({ Bucket: B2_BUCKET, Key: originalKey, Body: originalBuf, ContentType: originalContentType,   ContentLength: originalBuf.length })),
  ]);

  return { fullKey, thumbKey, originalKey, width, height, size: full.length };
}

module.exports = { uploadPhoto, uploadPhotoWithWatermark, getSignedPhotoUrl, deleteFile, deleteGalleryFiles };
