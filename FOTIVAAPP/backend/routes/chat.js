const router    = require('express').Router();
const { auth, requireActive } = require('../middleware/auth');
const { Client, Event } = require('../models/models');
const Anthropic  = require('@anthropic-ai/sdk');

router.use(auth, requireActive);

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Mensagem vazia' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.json({ message: '⚠️ Configure ANTHROPIC_API_KEY no servidor.' });

  const clients = await Client.find({ userId: req.user._id }).select('name _id').limit(100);
  const clientsList = clients.map(c => `${c.name}(id:${c._id})`).join(',') || 'Nenhum';

  const anthropic = new Anthropic({ apiKey });
  const system = `Assistente FOTIVA. Fotógrafo: ${req.user.name}. Clientes: ${clientsList}. Data: ${new Date().toLocaleDateString('pt-BR')}.
Responda APENAS com JSON:
{"acao":"criar_evento"|"criar_cliente"|"listar_clientes"|"listar_eventos"|"conversa","dados":{"tipo_evento":null,"cliente_nome":null,"cliente_id":null,"data":null,"horario":null,"valor_total":null,"valor_pago":null,"forma_pagamento":null,"parcelas":null,"local":null,"observacoes":null},"resumo":"texto legível","resposta":null}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514', max_tokens: 600,
    system, messages: [{ role: 'user', content: message }],
  });

  let parsed;
  try {
    parsed = JSON.parse(response.content[0].text.trim().replace(/```json|```/g,''));
  } catch {
    return res.json({ message: '❌ Não entendi. Tente ser mais específico.' });
  }

  const { acao, dados, resumo, resposta } = parsed;

  if (acao === 'listar_clientes') {
    const all = await Client.find({ userId: req.user._id }).sort({ name: 1 });
    if (!all.length) return res.json({ message: '📋 Sem clientes ainda. Diga: "Novo cliente [nome]"' });
    return res.json({ message: `👥 Clientes (${all.length}):\n${all.slice(0,20).map(c=>`• ${c.name}${c.phone?` — ${c.phone}`:''}`).join('\n')}` });
  }

  if (acao === 'listar_eventos') {
    const all = await Event.find({ userId: req.user._id, eventDate: { $gte: new Date() } }).sort({ eventDate: 1 }).limit(10);
    if (!all.length) return res.json({ message: '📅 Nenhum evento futuro.' });
    return res.json({ message: `📅 Próximos:\n${all.map(e=>`• ${e.eventType} — ${e.clientName} — ${e.eventDate?new Date(e.eventDate).toLocaleDateString('pt-BR'):'Sem data'}`).join('\n')}` });
  }

  if (acao === 'criar_evento' || acao === 'criar_cliente') {
    return res.json({ message: `📋 Entendi!\n\n${resumo}\n\nConfirmar?`, acao_pendente: acao, dados, botoes: ['✅ Confirmar','✏️ Editar'] });
  }

  res.json({ message: resposta || resumo || 'Como posso ajudar?' });
});

router.post('/confirmar', async (req, res) => {
  const { acao_pendente, dados } = req.body;

  if (acao_pendente === 'criar_cliente') {
    if (!dados?.cliente_nome) return res.status(400).json({ error: 'Nome obrigatório' });
    const c = await Client.create({ userId: req.user._id, name: dados.cliente_nome, phone: dados.telefone||'', email: dados.email||'' });
    return res.json({ message: `✅ Cliente **${c.name}** cadastrado!` });
  }

  if (acao_pendente === 'criar_evento') {
    let clientId = dados.cliente_id, clientName = dados.cliente_nome || '';
    if (!clientId && clientName) {
      let c = await Client.findOne({ userId: req.user._id, name: new RegExp(clientName,'i') });
      if (!c) c = await Client.create({ userId: req.user._id, name: clientName });
      clientId = c._id; clientName = c.name;
    }
    if (!clientId) return res.status(400).json({ error: 'Cliente não identificado' });

    let eventDate = null;
    if (dados.data) {
      try { eventDate = new Date(`${dados.data}T${dados.horario||'09:00'}:00`); } catch {}
    }

    const total = parseFloat(dados.valor_total)||0;
    const pago  = parseFloat(dados.valor_pago)||0;
    const e = await Event.create({
      userId: req.user._id, clientId, clientName,
      eventType: dados.tipo_evento||'Sessão', eventDate,
      location: dados.local||'', totalValue: total, amountPaid: pago,
      installments: dados.parcelas||1, paymentType: dados.forma_pagamento||'pix',
      notes: dados.observacoes||'',
    });

    return res.json({ message: `✅ Evento criado!\n\n📸 ${e.eventType} — ${clientName}\n📅 ${dados.data||'Sem data'} às ${dados.horario||'--'}\n💰 Total: R$${total.toFixed(2)} | Pago: R$${pago.toFixed(2)} | Saldo: R$${(total-pago).toFixed(2)}` });
  }

  res.status(400).json({ error: 'Ação não reconhecida' });
});

module.exports = router;
