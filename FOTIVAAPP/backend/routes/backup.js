const router   = require('express').Router();
const { exec } = require('child_process');
const fs       = require('fs');

router.post('/backup', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET)
    return res.status(403).json({ error: 'Acesso negado.' });

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0,19);
    const filename  = `fotiva-backup-${timestamp}.gz`;
    const tmpPath   = `/tmp/${filename}`;

    await new Promise((resolve, reject) => {
      exec(
        `mongodump --uri="${process.env.MONGO_URL}" --db="${process.env.DB_NAME || 'fotiva'}" --gzip --archive="${tmpPath}"`,
        (err, stdout, stderr) => err ? reject(new Error(stderr || err.message)) : resolve()
      );
    });

    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({
      endpoint:    'https://s3.us-west-004.backblazeb2.com',
      region:      'us-west-004',
      credentials: { accessKeyId: process.env.B2_KEY_ID, secretAccessKey: process.env.B2_APP_KEY },
    });

    await client.send(new PutObjectCommand({
      Bucket:      'fotiva-backups',
      Key:         `backups/${filename}`,
      Body:        fs.readFileSync(tmpPath),
      ContentType: 'application/gzip',
    }));

    fs.unlinkSync(tmpPath);
    res.json({ ok: true, filename, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error('❌ Erro no backup:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
