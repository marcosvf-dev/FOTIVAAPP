// v2 - rotas cliente
const router     = require('express').Router();
const multer     = require('multer');
const { v4: uuid } = require('uuid');
const bcrypt     = require('bcryptjs');
const nodemailer = require('nodemailer');

const { auth, requireActive, requirePro } = require('../middleware/auth');
const Gallery  = require('../models/Gallery');
const { uploadPhoto, uploadPhotoWithWatermark, getSignedPhotoUrl, deleteFile, deleteGalleryFiles } = require('../lib/b2');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

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

  // Texto da marca d'água = nome do estúdio ou nome do fotógrafo
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

// Atualizar configurações da galeria (download, marca d'água)
// PATCH /api/gallery/photographer/:id/credentials — atualiza email e senha do cliente
router.patch('/photographer/:id/credentials', async (req, res) => {
  const { clientEmail, password } = req.body;
  if (!clientEmail) return res.status(400).json({ error: 'Email obrigatorio' });

  const gallery = await Gallery.findOne({ _id: req.params.id, userId: req.user._id });
  if (!gallery) return res.status(404).json({ error: 'Galeria nao encontrada' });

  gallery.clientEmail = clientEmail.trim().toLowerCase();
  if (password && password.trim()) {
    const bcrypt = require('bcryptjs');
    gallery.password = await bcrypt.hash(password.trim(), 10);
    gallery.passwordPlain = password.trim();
  }
  await gallery.save();
  res.json({ ok: true, clientEmail: gallery.clientEmail, passwordPlain: gallery.passwordPlain || '' });
});

// PATCH /api/gallery/photographer/:id/settings — download, marca dagua, limite
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

        // Se marca d'água habilitada, aplica texto antes de subir
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

  const selected = gallery.photos.filter(p => p.selected);
  if (!selected.length) return res.status(400).json({ error: 'Nenhuma foto selecionada ainda' });

  try {
    const list = selected.map((p,i) => `${i+1}. ${p.filename}`).join('\n');
    await getTransporter().sendMail({
      from: `"Fotiva" <${process.env.SMTP_USER}>`,
      to:   req.user.email,
      subject: `📸 Seleção de fotos — ${gallery.title}`,
      html: `<h2>📸 Seleção de fotos</h2>
<p><strong>Galeria:</strong> ${gallery.title}<br><strong>Cliente:</strong> ${gallery.clientName}</p>
<h3>${selected.length} fotos selecionadas:</h3>
<ol>${selected.map(p=>`<li>${p.filename}</li>`).join('')}</ol>
<hr><p style="color:#999">Fotiva</p>`,
    });
    gallery.selectionSentAt = new Date();
    await gallery.save();
    res.json({ ok: true, sent: selected.length });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao enviar email: ' + e.message });
  }
});

// Encerrar galeria (apaga tudo)
router.post('/photographer/:id/close', async (req, res) => {
  const gallery = await Gallery.findOne({ _id: req.params.id, userId: req.user._id });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  await deleteGalleryFiles(`galleries/${gallery._id}/`);
  gallery.status   = 'closed';
  gallery.closedAt = new Date();
  gallery.photos   = [];
  await gallery.save();

  res.json({ ok: true, message: 'Galeria encerrada e fotos apagadas.' });
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

// Login do cliente
router.post('/client/login', async (req, res) => {
  const { galleryId, email, password } = req.body;
  const gallery = await Gallery.findById(galleryId).select('+password');
  if (!gallery || gallery.status === 'closed')
    return res.status(404).json({ error: 'Galeria não encontrada ou encerrada' });

  if (gallery.clientEmail.toLowerCase() !== email.toLowerCase())
    return res.status(401).json({ error: 'Email incorreto' });

  const ok = await bcrypt.compare(password, gallery.password);
  if (!ok) return res.status(401).json({ error: 'Senha incorreta' });

  const photos = await Promise.all(gallery.photos.map(async p => {
    // Suporte aos dois formatos de chave: antigo (.webp) e novo (_full/_thumb)
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

  res.json({
    ok: true,
    gallery: {
      _id:             gallery._id,
      title:           gallery.title,
      description:     gallery.description,
      clientName:      gallery.clientName,
      faceEnabled:     gallery.faceEnabled,
      downloadEnabled: gallery.downloadEnabled,
      watermarkEnabled:gallery.watermarkEnabled,
      totalPhotos:     gallery.photos.length,
      expiresAt:       gallery.expiresAt,
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

// Cliente finaliza seleção — envia email + agenda exclusão em 7 dias
router.post('/client/:id/finish', async (req, res) => {
  const { email, password } = req.body;
  const gallery = await Gallery.findById(req.params.id).select('+password').populate('userId', 'email name studioName');
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  const emailOk = gallery.clientEmail.toLowerCase() === email.toLowerCase();
  const pwdOk   = await bcrypt.compare(password, gallery.password);
  if (!emailOk || !pwdOk) return res.status(401).json({ error: 'Não autorizado' });

  const selected = gallery.photos.filter(p => p.selected);
  if (!selected.length) return res.status(400).json({ error: 'Selecione pelo menos 1 foto' });

  try {
    const photographerEmail = gallery.userId?.email || process.env.ADMIN_EMAIL;
    const studioName = gallery.userId?.studioName || gallery.userId?.name || 'Fotiva';

    // Email para o fotógrafo
    await getTransporter().sendMail({
      from: `"Fotiva Galeria" <${process.env.SMTP_USER}>`,
      to:   photographerEmail,
      subject: `📸 ${gallery.clientName} finalizou a seleção — ${gallery.title}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;padding:32px 20px;">
          <div style="background:#111;border:1px solid #222;border-radius:16px;padding:28px;">
            <div style="font-size:24px;font-weight:900;color:#E87722;margin-bottom:16px;">📸 Seleção Finalizada!</div>
            <p style="color:#ccc;font-size:15px;line-height:1.6;">
              <strong style="color:#fff">${gallery.clientName}</strong> finalizou a seleção de fotos da galeria
              <strong style="color:#fff">${gallery.title}</strong>.
            </p>
            <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin:20px 0;">
              <div style="color:#888;font-size:12px;margin-bottom:4px;">FOTOS SELECIONADAS</div>
              <div style="color:#E87722;font-size:28px;font-weight:900;">${selected.length} <span style="font-size:14px;color:#666">de ${gallery.photos.length}</span></div>
            </div>
            <h3 style="color:#fff;font-size:14px;margin-bottom:12px;">Fotos escolhidas:</h3>
            <ol style="color:#aaa;font-size:13px;line-height:2;padding-left:20px;">
              ${selected.map(p=>`<li><strong style="color:#ddd">${p.filename}</strong></li>`).join('')}
            </ol>
            <hr style="border:1px solid #222;margin:20px 0;">
            <p style="color:#555;font-size:12px;">
              ⚠️ As fotos serão excluídas automaticamente em <strong style="color:#E87722">7 dias</strong>.
            </p>
          </div>
        </div>`,
    });

    // Email de confirmação para o cliente
    await getTransporter().sendMail({
      from: `"${studioName}" <${process.env.SMTP_USER}>`,
      to:   gallery.clientEmail,
      subject: `✅ Seleção confirmada — ${gallery.title}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;padding:32px 20px;">
          <div style="background:#111;border:1px solid #222;border-radius:16px;padding:28px;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">✅</div>
            <h2 style="color:#fff;margin-bottom:12px;">Seleção recebida!</h2>
            <p style="color:#aaa;font-size:14px;line-height:1.7;">
              Olá, <strong style="color:#fff">${gallery.clientName}</strong>!<br>
              Recebemos sua seleção de <strong style="color:#E87722">${selected.length} foto(s)</strong>
              da galeria <strong style="color:#fff">${gallery.title}</strong>.<br><br>
              Em breve entraremos em contato!
            </p>
            <hr style="border:1px solid #222;margin:20px 0;">
            <p style="color:#555;font-size:12px;">${studioName}</p>
          </div>
        </div>`,
    });

    // Agenda exclusão automática em 7 dias via TTL do MongoDB
    gallery.selectionSentAt = new Date();
    gallery.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await gallery.save();

    res.json({ ok: true, message: `Email enviado com ${selected.length} fotos! Galeria será excluída em 7 dias.` });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao enviar: ' + e.message });
  }
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

  // URL assinada do original (qualidade total) válida por 5 minutos para download
  const downloadKey = photo.b2OriginalKey || photo.b2FileName;
  const url = await getSignedPhotoUrl(downloadKey, 300);
  res.json({ ok: true, url, filename: photo.filename });
});

module.exports = router;
