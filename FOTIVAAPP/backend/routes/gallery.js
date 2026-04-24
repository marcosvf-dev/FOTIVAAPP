const router   = require('express').Router();
const multer   = require('multer');
const { v4: uuid } = require('uuid');
const bcrypt   = require('bcryptjs');
const nodemailer = require('nodemailer');

const { auth, requireActive, requirePro } = require('../middleware/auth');
const Gallery  = require('../models/Gallery');
const { uploadPhoto, getSignedPhotoUrl, deleteFile, deleteGalleryFiles } = require('../lib/b2');

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
  const { title, description, clientName, clientEmail, password, faceEnabled } = req.body;
  if (!title || !clientName || !clientEmail || !password)
    return res.status(400).json({ error: 'Campos obrigatórios: título, cliente, email, senha' });

  const hashedPwd = await bcrypt.hash(password, 10);
  const gallery = await Gallery.create({
    userId: req.user._id,
    title, description: description || '',
    clientName, clientEmail,
    password: hashedPwd,
    faceEnabled: !!faceEnabled,
    photos: [],
  });

  res.json({ ok: true, gallery: { _id: gallery._id, title: gallery.title, clientName, clientEmail } });
});

// Detalhes de uma galeria (fotógrafo)
router.get('/photographer/:id', async (req, res) => {
  const gallery = await Gallery.findOne({ _id: req.params.id, userId: req.user._id });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  // Gera URLs assinadas para as fotos
  const photosWithUrls = await Promise.all(gallery.photos.map(async p => ({
    id: p.id,
    filename: p.filename,
    selected: p.selected,
    size: p.size,
    width: p.width,
    height: p.height,
    url:          p.b2FileName ? await getSignedPhotoUrl(p.b2FileName).catch(() => null) : null,
    thumbnailUrl: p.b2FileName ? await getSignedPhotoUrl(p.b2FileName.replace('.webp','_thumb.webp')).catch(() => null) : null,
  })));

  res.json({ ...gallery.toObject(), photos: photosWithUrls });
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
        const { fullKey, thumbKey, width, height, size } = await uploadPhoto(file.buffer, file.mimetype, path);

        const photo = {
          id:          photoId,
          filename:    file.originalname,
          b2FileId:    photoId,
          b2FileName:  fullKey,
          size, width, height,
          selected: false,
        };
        gallery.photos.push(photo);
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

  // Deleta do B2
  await deleteFile(photo.b2FileName);
  await deleteFile(photo.b2FileName.replace('.webp','_thumb.webp'));

  gallery.photos = gallery.photos.filter(p => p.id !== req.params.photoId);
  await gallery.save();
  res.json({ ok: true });
});

// Enviar email com seleção para o fotógrafo
router.post('/photographer/:id/send-selection', async (req, res) => {
  const gallery = await Gallery.findOne({ _id: req.params.id, userId: req.user._id });
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  const selected = gallery.photos.filter(p => p.selected);
  if (!selected.length) return res.status(400).json({ error: 'Nenhuma foto selecionada ainda' });

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const list = selected.map((p,i) => `${i+1}. ${p.filename} (ID: ${p.id})`).join('\n');

    await transporter.sendMail({
      from: `"Fotiva" <${process.env.SMTP_USER}>`,
      to: req.user.email,
      subject: `📸 Seleção de fotos — ${gallery.title}`,
      text: `Galeria: ${gallery.title}\nCliente: ${gallery.clientName}\n\nFotos selecionadas (${selected.length}):\n\n${list}\n\n---\nFotiva — Seu estúdio na palma da mão`,
      html: `<h2>📸 Seleção de fotos</h2>
<p><strong>Galeria:</strong> ${gallery.title}<br>
<strong>Cliente:</strong> ${gallery.clientName}</p>
<h3>${selected.length} fotos selecionadas:</h3>
<ol>${selected.map(p=>`<li><strong>${p.filename}</strong> <small style="color:#999">(ID: ${p.id})</small></li>`).join('')}</ol>
<hr><p style="color:#999">Fotiva — Seu estúdio na palma da mão</p>`,
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

  // Apaga todas as fotos do B2
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

  // Gera URLs das fotos
  const photos = await Promise.all(gallery.photos.map(async p => ({
    id: p.id,
    filename: p.filename,
    selected: p.selected,
    thumbnailUrl: p.b2FileName ? await getSignedPhotoUrl(p.b2FileName.replace('.webp','_thumb.webp')).catch(()=>null) : null,
    url:          p.b2FileName ? await getSignedPhotoUrl(p.b2FileName).catch(()=>null) : null,
  })));

  res.json({
    ok: true,
    gallery: {
      _id:         gallery._id,
      title:       gallery.title,
      description: gallery.description,
      clientName:  gallery.clientName,
      faceEnabled: gallery.faceEnabled,
      totalPhotos: gallery.photos.length,
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

// Cliente finaliza seleção — envia email para fotógrafo
router.post('/client/:id/finish', async (req, res) => {
  const { email, password } = req.body;
  const gallery = await Gallery.findById(req.params.id).select('+password').populate('userId', 'email name');
  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });

  const emailOk = gallery.clientEmail.toLowerCase() === email.toLowerCase();
  const pwdOk   = await bcrypt.compare(password, gallery.password);
  if (!emailOk || !pwdOk) return res.status(401).json({ error: 'Não autorizado' });

  const selected = gallery.photos.filter(p => p.selected);
  if (!selected.length) return res.status(400).json({ error: 'Selecione pelo menos 1 foto' });

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const photographerEmail = gallery.userId?.email || process.env.ADMIN_EMAIL;

    await transporter.sendMail({
      from: `"Fotiva Galeria" <${process.env.SMTP_USER}>`,
      to: photographerEmail,
      subject: `📸 ${gallery.clientName} finalizou a seleção — ${gallery.title}`,
      html: `<h2>📸 Seleção finalizada!</h2>
<p><strong>Galeria:</strong> ${gallery.title}</p>
<p><strong>Cliente:</strong> ${gallery.clientName} (${gallery.clientEmail})</p>
<p><strong>Fotos selecionadas:</strong> ${selected.length} de ${gallery.photos.length}</p>
<h3>Fotos escolhidas:</h3>
<ol>${selected.map(p=>`<li><strong>${p.filename}</strong> <small style="color:#999">ID: ${p.id}</small></li>`).join('')}</ol>
<hr><p style="color:#999">Fotiva — Seu estúdio na palma da mão</p>`,
    });

    gallery.selectionSentAt = new Date();
    await gallery.save();
    res.json({ ok: true, message: `Email enviado com ${selected.length} fotos selecionadas!` });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao enviar: ' + e.message });
  }
});

module.exports = router;
