const router = require('express').Router();
const mongoose = require('mongoose');

router.post('/backup', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET)
    return res.status(403).json({ error: 'Acesso negado.' });

  try {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

    // Exporta todas as collections via mongoose
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const backup = {};

    for (const col of collections) {
      const docs = await db.collection(col.name).find({}).toArray();
      backup[col.name] = docs;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename  = `fotiva-backup-${timestamp}.json`;
    const content   = JSON.stringify(backup, null, 2);

    const client = new S3Client({
      endpoint:    'https://s3.us-west-004.backblazeb2.com',
      region:      'us-west-004',
      credentials: {
        accessKeyId:     process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APP_KEY,
      },
    });

    await client.send(new PutObjectCommand({
      Bucket:      'fotiva-backups',
      Key:         `backups/${filename}`,
      Body:        Buffer.from(content),
      ContentType: 'application/json',
    }));

    console.log(`✅ Backup: ${filename} (${collections.length} collections)`);
    res.json({ ok: true, filename, collections: collections.length });
  } catch (e) {
    console.error('❌ Backup erro:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
