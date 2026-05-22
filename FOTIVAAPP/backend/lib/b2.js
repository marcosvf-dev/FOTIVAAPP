const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const sharp = require('sharp');

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

async function uploadPhotoWithWatermark(buffer, mimeType, path, watermarkText) {
  const original = Buffer.from(buffer);

  // Lê dimensões da imagem original
  const meta = await sharp(original).metadata();
  const w = meta.width  || 1200;
  const h = meta.height || 800;

  // Tamanho da fonte proporcional à largura da imagem
  const fontSize = Math.max(24, Math.round(w * 0.04));

  // SVG com o texto da marca d'água
  const svgText = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .wm {
          font-family: Arial, sans-serif;
          font-size: ${fontSize}px;
          font-weight: bold;
          fill: rgba(255,255,255,0.55);
          text-anchor: middle;
        }
      </style>
      <text
        x="${Math.round(w / 2)}"
        y="${Math.round(h / 2)}"
        class="wm"
        transform="rotate(-30, ${Math.round(w / 2)}, ${Math.round(h / 2)})"
      >${watermarkText}</text>
    </svg>
  `;

  // Aplica marca d'água na imagem full (exibição) — original fica sem marca
  const watermarkedBuf = await sharp(original)
    .composite([{ input: Buffer.from(svgText), blend: 'over' }])
    .jpeg({ quality: 88 })
    .toBuffer();

  // Thumb também com marca d'água, reduzido para 600px
  const thumbBuf = await sharp(original)
    .resize({ width: 600, withoutEnlargement: true })
    .composite([{
      input: Buffer.from(svgText.replace(`width="${w}"`, 'width="600"').replace(`height="${h}"`, `height="${Math.round(h * 600 / w)}"`)),
      blend: 'over'
    }])
    .jpeg({ quality: 75 })
    .toBuffer();

  const fullKey     = `${path}_full`;
  const thumbKey    = `${path}_thumb`;
  const originalKey = `${path}_original`;

  await Promise.all([
    s3.send(new PutObjectCommand({ Bucket:B2_BUCKET, Key:fullKey,     Body:watermarkedBuf, ContentType:'image/jpeg', ContentLength:watermarkedBuf.length })),
    s3.send(new PutObjectCommand({ Bucket:B2_BUCKET, Key:thumbKey,    Body:thumbBuf,       ContentType:'image/jpeg', ContentLength:thumbBuf.length })),
    s3.send(new PutObjectCommand({ Bucket:B2_BUCKET, Key:originalKey, Body:original,       ContentType:'image/jpeg', ContentLength:original.length })),
  ]);

  return { fullKey, thumbKey, originalKey, width:w, height:h, size:original.length };
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
