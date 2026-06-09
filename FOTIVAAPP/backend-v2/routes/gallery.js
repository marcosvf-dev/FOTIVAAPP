const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const multer  = require('multer');
const prisma  = require('../lib/prisma');
const { uploadPhoto, getSignedPhotoUrl, deleteFile, deleteGalleryFiles } = require('../lib/r2');
const { auth, requireActive, requirePro } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── FOTÓGRAFO ────────────────────────────────────────────────────────────────

// GET /api/gallery/photographer
router.get('/photographer', auth, requireActive, requirePro, async (req, res) => {
  const galleries = await prisma.gallery.findMany({
    where:   { userId: req.user.id },
    include: { _count: { select: { photos: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(galleries);
});

// POST /api/gallery/photographer
router.post('/photographer', auth, requireActive, requirePro, async (req, res) => {
  const { title, description, clientName, clientEmail, password, downloadEnabled, watermarkEnabled, watermarkText, expiresAt } = req.body;
  if (!title || !clientName || !clientEmail || !password) return res.status(400).json({ error: 'Campos obrigatórios faltando.' });

  const gallery = await prisma.gallery.create({
    data: {
      userId:          req.user.id,
      title,
      description:     description || '',
      clientName,
      clientEmail:     clientEmail.toLowerCase().trim(),
      password:        await bcrypt.hash(password.trim(), 10),
      downloadEnabled: Boolean(downloadEnabled),
      watermarkEnabled:Boolean(watermarkEnabled),
      watermarkText:   watermarkText || '',
      expiresAt:       expiresAt ? new Date(expiresAt) : null,
    }
  });
  res.status(201).json(gallery);
});

// GET /api/gallery/photographer/:id
router.get('/photographer/:id', auth, requireActive, requirePro, async (req, res) => {
  const gallery = await prisma.gallery.findFirst({
    where:   { id: req.params.id, userId: req.user.id },
    include: { photos: { orderBy: { uploadedAt: 'asc' } } },
  });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  // Gera URLs assinadas para cada foto
  const photosWithUrls = await Promise.all(gallery.photos.map(async (p) => ({
    ...p,
    url: p.originalKey ? await getSignedPhotoUrl(p.originalKey).catch(() => '') : '',
  })));

  res.json({ ...gallery, photos: photosWithUrls });
});

// POST /api/gallery/photographer/:id/upload
router.post('/photographer/:id/upload', auth, requireActive, requirePro, upload.array('photos', 100), async (req, res) => {
  const gallery = await prisma.gallery.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });
  if (!req.files?.length) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  const uploaded = [];
  for (const file of req.files) {
    const key    = `galleries/${gallery.id}/${Date.now()}_${file.originalname.replace(/\s/g,'_')}`;
    const result = await uploadPhoto(file.buffer, file.mimetype, key);
    const photo  = await prisma.galleryPhoto.create({
      data: {
        galleryId:   gallery.id,
        filename:    file.originalname,
        originalKey: result.originalKey,
        size:        result.size || file.size,
      }
    });
    uploaded.push({ ...photo, url: await getSignedPhotoUrl(result.originalKey) });
  }

  res.json({ uploaded: uploaded.length, photos: uploaded });
});

// DELETE /api/gallery/photographer/:id/photos/:photoId
router.delete('/photographer/:id/photos/:photoId', auth, requireActive, requirePro, async (req, res) => {
  const gallery = await prisma.gallery.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  const photo = await prisma.galleryPhoto.findFirst({ where: { id: req.params.photoId, galleryId: gallery.id } });
  if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

  if (photo.originalKey) await deleteFile(photo.originalKey).catch(() => {});
  await prisma.galleryPhoto.delete({ where: { id: photo.id } });
  res.json({ ok: true });
});

// DELETE /api/gallery/photographer/:id
router.delete('/photographer/:id', auth, requireActive, requirePro, async (req, res) => {
  const gallery = await prisma.gallery.findFirst({
    where:   { id: req.params.id, userId: req.user.id },
    include: { photos: true },
  });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  await deleteGalleryFiles(`galleries/${gallery.id}/`).catch(() => {});
  await prisma.gallery.delete({ where: { id: gallery.id } });
  res.json({ ok: true });
});

// ─── CLIENTE FINAL ────────────────────────────────────────────────────────────

// POST /api/gallery/client/access
router.post('/client/access', async (req, res) => {
  const { galleryId, email, password } = req.body;
  const gallery = await prisma.gallery.findUnique({ where: { id: galleryId } });
  if (!gallery || gallery.status !== 'active') return res.status(404).json({ error: 'Galeria não encontrada.' });
  if (gallery.expiresAt && new Date(gallery.expiresAt) < new Date()) return res.status(403).json({ error: 'Galeria expirada.' });
  if (gallery.clientEmail !== email?.toLowerCase().trim()) return res.status(403).json({ error: 'Email incorreto.' });
  if (!(await bcrypt.compare(password, gallery.password))) return res.status(403).json({ error: 'Senha incorreta.' });

  const photos = await prisma.galleryPhoto.findMany({ where: { galleryId: gallery.id }, orderBy: { uploadedAt: 'asc' } });
  const photosWithUrls = await Promise.all(photos.map(async p => ({
    ...p,
    url: p.originalKey ? await getSignedPhotoUrl(p.originalKey, 3600).catch(() => '') : '',
  })));

  const owner = await prisma.user.findUnique({ where: { id: gallery.userId }, select: { studioName: true, studioLogo: true } });
  res.json({ ...gallery, photos: photosWithUrls, studio: owner });
});

module.exports = router;
