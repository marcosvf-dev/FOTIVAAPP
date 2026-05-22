// v2 - rotas cliente
const router     = require('express').Router();
const multer     = require('multer');
const { v4: uuid } = require('uuid');
const bcrypt     = require('bcryptjs');

const { auth, requireActive, requirePro } = require('../middleware/auth');
const Gallery  = require('../models/Gallery');
const { uploadPhoto, uploadPhotoWithWatermark, getSignedPhotoUrl, deleteFile, deleteGalleryFiles } = require('../lib/b2');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ── FOTÓGRAFO: rotas protegidas ──────────────────────
router.use('/photographer', auth, requireActive, requirePro);

// Listar galerias do fotógrafo
router.get('/photographer', async (req, res) => {
  const gals = await Gallery.find({ userId: req.user._id })
    .select('-photos.b2FileId -photos.b2FileName')
    .sort({ createdAt: -1 });
  res.json(gals);
});

// Criar galeria
router.post('/photographer', async (req, res) => {
  const { title, description, clientName, clientEmail, password, faceEnabled, downloadEnabled, downloadLimit, extraPhotoPrice, watermarkEnabled } = req.body;
  if (!title || !clientName || !clientEmail || !password)
    return res.status(400).json({ error: 'Campos obrigatórios: título, cliente, email, senha' });

  const hashedPwd = await bcrypt.hash(password, 10);

  const watermarkText = req.user.studioName || req.user.name || '';

  const gallery = await Gallery.create({
    userId: req.user._id,
    title, description: description || '',
    clientName, clientEmail,
    password: hashedPwd,
    passwordPlain: password.trim(),
    faceEnabled:      !!faceEnabled,
    downloadEnabled:  !!downloadEnabled,
    downloadLimit:    downloadLimit !== undefined && downloadLimit !== '' ? parseInt(downloadLimit) : null,
    extraPhotoPrice:  parseFloat(extraPhotoPrice) || 0,
    watermarkEnabled: !!watermarkEnabled,
    watermarkText,
    photos: [],
  });

  res.json({ ok: true, gallery: { _id: gallery._id, title: gallery.title, clientName, clientEmail } });
});

// Detalhes de uma galeria (fotógrafo)
router.get('/photographer/:id', async (req, res) => {
  const gallery = await Gallery.findOne({ _id: req.params.id, userId: req.user._id });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  const photosWithUrls = await Promise.all(gallery.photos.map(async p => {
    const thumbKey = p.b2ThumbKey
      || (p.b2FileName?.endsWith('_full') ? p.b2FileName.replace('_full','_thumb') : null)
      || (p.b2FileName?.endsWith('.webp') ? p.b2FileName.replace('.webp','_thumb.webp') : null)
      || p.b2FileName;
    return {
      id: p.id, filename: p.filename, selected: p.selected,
      size: p.size, width: p.width, height: p.height,
      url:          p.b2FileName ? await getSignedPhotoUrl(p.b2FileName).catch(() => null) : null,
      thumbnailUrl: thumbKey ? await getSignedPhotoUrl(thumbKey).catch(() => null) : null,
    };
  }));

  res.json({ ...gallery.toObject(), passwordPlain: gallery.passwordPlain || '', photos: photosWithUrls });
});

// PATCH /api/gallery/photographer/:id/credentials
router.patch('/photographer/:id/credentials', async (req, res) => {
  const { clientEmail, password } = req.body;
  if (!clientEmail) return res.status(400).json({ error: 'Email obrigatorio' });

  const gallery = await Gallery.findOne({ _id: req.params.id, userId: req.user._id });
  if (!gallery) return res.status(404).json({ error: 'Galeria nao encontrada' });

  gallery.clientEmail = clientEmail.trim().toLowerCase();
  if (password && password.trim()) {
    gallery.password = await bcrypt.hash(password.trim(), 10);
    gallery.passwordPlain = password.trim();
  }
  await gallery.save();
  res.json({ ok: true, clientEmail: gallery.clientEmail, passwordPlain: gallery.passwordPlain || '' });
});

// PATCH /api/gallery/photographer/:id/settings
router.patch('/photographer/:id/settings', async (req, res) => {
  const { downloadEnabled, watermarkEnabled, downloadLimit, extraPhotoPrice } = req.body;
  const gallery = await Gallery.findOne({ _id: req.params.id, userId: req.user._id });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  if (downloadEnabled  !== undefined) gallery.downloadEnabled  = !!downloadEnabled;
  if (watermarkEnabled !== undefined) gallery.watermarkEnabled = !!watermarkEnabled;
  await gallery.save();

  res.json({ ok: true, downloadEnabled: gallery.downloadEnabled, watermarkEnabled: gallery.watermarkEnabled });
});

// Upload de fotos (máx 20 por vez)
router.post('/photographer/:id/upload',
  upload.array('photos', 20),
  async (req, res) => {
    const gallery = await Gallery.findOne({ _id: req.params.id, userId: req.user._id });
    if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });
    if (gallery.status === 'closed') return res.status(400).json({ error: 'Galeria encerrada' });

    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'Nenhuma foto enviada' });

    const uploaded = [];
    const errors   = [];

    for (const file of files) {
      try {
        const photoId = uuid();
        const path    = `galleries/${gallery._id}/${photoId}`;

        const result = gallery.watermarkEnabled && gallery.watermarkText
          ? await uploadPhotoWithWatermark(file.buffer, file.mimetype, path, gallery.watermarkText)
          : await uploadPhoto(file.buffer, file.mimetype, path);

        const { fullKey, thumbKey, originalKey, width, height, size } = result;

        gallery.photos.push({
          id: photoId, filename: file.originalname,
          b2FileId: photoId, b2FileName: fullKey,
          b2ThumbKey: thumbKey,
          b2OriginalKey: originalKey,
          size, width, height, selected: false,
        });
        uploaded.push({ id: photoId, filename: file.originalname });
      } catch (e) {
        errors.push({ filename: file.originalname, error: e.message });
      }
    }

    await gallery.save();
    res.json({ ok: true, uploaded: uploaded.length, errors, total: gallery.photos.length });
  }
);

// Deletar foto
router.delete('/photographer/:id/photo/:photoId', async (req, res) => {
  const gallery = await Gallery.findOne({ _id: req.params.id, userId: req.user._id });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  const photo = gallery.photos.find(p => p.id === req.params.photoId);
  if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

  await deleteFile(photo.b2FileName);
  await deleteFile(photo.b2FileName.replace('.webp','_thumb.webp'));

  gallery.photos = gallery.photos.filter(p => p.id !== req.params.photoId);
  await gallery.save();
  res.json({ ok: true });
});

// Enviar email com seleção para o fotógrafo (ação manual)
router.post('/photographer/:id/send-selection', async (req, res) => {
  const gallery = await Gallery.findOne({ _id: req.params.id, userId: req.user._id });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });
  res.json({ ok: true });
});

// Fechar galeria
router.patch('/photographer/:id/close', async (req, res) => {
  const gallery = await Gallery.findOne({ _id: req.params.id, userId: req.user._id });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });
  gallery.status = 'closed';
  await gallery.save();
  res.json({ ok: true });
});

// Deletar galeria permanentemente
router.delete('/photographer/:id', async (req, res) => {
  const gallery = await Gallery.findOne({ _id: req.params.id, userId: req.user._id });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  await deleteGalleryFiles(`galleries/${gallery._id}/`);
  await gallery.deleteOne();
  res.json({ ok: true });
});

// ── CLIENTE: acesso público com senha ───────────────

// Login do cliente — retorna phone do fotógrafo para o botão de WhatsApp
router.post('/client/login', async (req, res) => {
  const { galleryId, email, password } = req.body;
  const gallery = await Gallery.findById(galleryId)
    .select('+password')
    .populate('userId', 'name studioName phone');

  if (!gallery || gallery.status === 'closed')
    return res.status(404).json({ error: 'Galeria não encontrada ou encerrada' });

  if (gallery.clientEmail.toLowerCase() !== email.toLowerCase())
    return res.status(401).json({ error: 'Email incorreto' });

  const ok = await bcrypt.compare(password, gallery.password);
  if (!ok) return res.status(401).json({ error: 'Senha incorreta' });

  const photos = await Promise.all(gallery.photos.map(async p => {
    const thumbKey = p.b2ThumbKey
      || (p.b2FileName?.endsWith('_full') ? p.b2FileName.replace('_full','_thumb') : null)
      || (p.b2FileName?.endsWith('.webp') ? p.b2FileName.replace('.webp','_thumb.webp') : null)
      || p.b2FileName;
    const downloadKey = p.b2OriginalKey || p.b2FileName;
    return {
      id: p.id, filename: p.filename, selected: p.selected,
      thumbnailUrl: thumbKey ? await getSignedPhotoUrl(thumbKey).catch(()=>null) : null,
      url: p.b2FileName ? await getSignedPhotoUrl(downloadKey).catch(()=>null) : null,
    };
  }));

  // Limpa o phone para conter só dígitos
  const rawPhone = gallery.userId?.phone || '';
  const phone = rawPhone.replace(/\D/g, '');

  res.json({
    ok: true,
    gallery: {
      _id:             gallery._id,
      title:           gallery.title,
      description:     gallery.description,
      clientName:      gallery.clientName,
      faceEnabled:     gallery.faceEnabled,
      downloadEnabled: gallery.downloadEnabled,
      downloadLimit:   gallery.downloadLimit ?? null,
      extraPhotoPrice: gallery.extraPhotoPrice || 0,
      watermarkEnabled:gallery.watermarkEnabled,
      totalPhotos:     gallery.photos.length,
      expiresAt:       gallery.expiresAt,
      photographerPhone: phone,
      photographerName:  gallery.userId?.studioName || gallery.userId?.name || '',
    },
    photos,
  });
});

// Cliente seleciona / deseleciona foto
router.post('/client/:id/select', async (req, res) => {
  const { email, password, photoId, selected } = req.body;
  const gallery = await Gallery.findById(req.params.id).select('+password');
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  const emailOk = gallery.clientEmail.toLowerCase() === email.toLowerCase();
  const pwdOk   = await bcrypt.compare(password, gallery.password);
  if (!emailOk || !pwdOk) return res.status(401).json({ error: 'Não autorizado' });

  const photo = gallery.photos.find(p => p.id === photoId);
  if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

  photo.selected = selected;
  await gallery.save();
  res.json({ ok: true, selected: photo.selected });
});

// Cliente finaliza seleção — salva no banco e retorna dados para WhatsApp
router.post('/client/:id/finish', async (req, res) => {
  const { email, password } = req.body;
  const gallery = await Gallery.findById(req.params.id)
    .select('+password')
    .populate('userId', 'name studioName phone');

  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  const emailOk = gallery.clientEmail.toLowerCase() === email.toLowerCase();
  const pwdOk   = await bcrypt.compare(password, gallery.password);
  if (!emailOk || !pwdOk) return res.status(401).json({ error: 'Não autorizado' });

  const selectedPhotos = gallery.photos.filter(p => p.selected);
  if (!selectedPhotos.length) return res.status(400).json({ error: 'Selecione pelo menos 1 foto' });

  // Salva timestamp da seleção
  gallery.selectionSentAt = new Date();
  await gallery.save();

  const rawPhone = gallery.userId?.phone || '';
  const phone = rawPhone.replace(/\D/g, '');
  const studioName = gallery.userId?.studioName || gallery.userId?.name || '';

  res.json({
    ok: true,
    selectedCount: selectedPhotos.length,
    selectedFilenames: selectedPhotos.map(p => p.filename),
    photographerPhone: phone,
    photographerName:  studioName,
    galleryTitle:      gallery.title,
    clientName:        gallery.clientName,
  });
});

// Cliente faz download de uma foto (se habilitado)
router.post('/client/:id/download/:photoId', async (req, res) => {
  const { email, password } = req.body;
  const gallery = await Gallery.findById(req.params.id).select('+password');
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  if (!gallery.downloadEnabled)
    return res.status(403).json({ error: 'Download não habilitado pelo fotógrafo' });

  const emailOk = gallery.clientEmail.toLowerCase() === email.toLowerCase();
  const pwdOk   = await bcrypt.compare(password, gallery.password);
  if (!emailOk || !pwdOk) return res.status(401).json({ error: 'Não autorizado' });

  const photo = gallery.photos.find(p => p.id === req.params.photoId);
  if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

  const downloadKey = photo.b2OriginalKey || photo.b2FileName;
  const url = await getSignedPhotoUrl(downloadKey, 300, photo.filename);
  res.json({ ok: true, url, filename: photo.filename });
});

module.exports = router;
