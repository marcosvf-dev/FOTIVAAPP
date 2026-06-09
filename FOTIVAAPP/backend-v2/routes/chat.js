const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const prisma    = require('../lib/prisma');
const { auth, requireActive } = require('../middleware/auth');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
router.use(auth, requireActive);

router.post('/', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensagem é obrigatória.' });

  const [clients, events] = await Promise.all([
    prisma.client.findMany({ where: { userId: req.user.id }, select: { id: true, name: true }, take: 50 }),
    prisma.event.findMany({ where: { userId: req.user.id, archived: false }, select: { id: true, clientName: true, eventType: true, totalValue: true }, take: 20 }),
  ]);

  const systemPrompt = `Você é o assistente da Fotiva, um sistema de gestão para fotógrafos.
Fotógrafo: ${req.user.name} | Estúdio: ${req.user.studioName || 'não informado'}
Clientes cadastrados: ${clients.map(c => `${c.name} (${c.id})`).join(', ') || 'nenhum'}
Eventos recentes: ${events.map(e => `${e.clientName} - ${e.eventType}`).join(', ') || 'nenhum'}
Responda em português. Seja direto e útil.`;

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system:     systemPrompt,
    messages:   [...history, { role: 'user', content: message }],
  });

  res.json({ reply: response.content[0].text });
});

module.exports = router;
