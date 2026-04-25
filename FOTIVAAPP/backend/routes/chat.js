const router = require('express').Router();
const { auth, requireActive, requireNormalOrPro } = require('../middleware/auth');
const { Client, Event } = require('../models/models');

router.use(auth, requireActive);

// ── GEMINI ──────────────────────────────────────────
async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Erro Gemini');
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── ROTA PRINCIPAL ───────────────────────────────────
router.post('/', requireNormalOrPro, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Mensagem vazia' });

  const clients = await Client.find({ userId: req.user._id }).select('name _id').limit(100);
  const clientsList = clients.length
    ? clients.map(c => `- "${c.name}" (id: ${c._id})`).join('\n')
    : '(nenhum cliente cadastrado)';

  const hoje = new Date();
  const hojeStr = hoje.toLocaleDateString('pt-BR');
  const anoAtual = hoje.getFullYear();
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey || geminiKey.includes('placeholder')) {
    return res.json({
      message: '⚠️ Configure GEMINI_API_KEY no Render.\nAcesse aistudio.google.com para obter sua chave gratuita.'
    });
  }

  const prompt = `Você é o assistente do app FOTIVA, que ajuda fotógrafos brasileiros a gerenciar eventos e clientes.

CONTEXTO:
- Fotógrafo: ${req.user.name}
- Data de hoje: ${hojeStr} (ano ${anoAtual})
- Clientes cadastrados:
${clientsList}

MENSAGEM DO FOTÓGRAFO: "${message}"

TAREFA: Analise a mensagem e retorne um JSON válido (sem markdown, sem texto extra).

REGRAS IMPORTANTES:
1. Datas: sempre no formato YYYY-MM-DD. Se o usuário disser "15/06", use "${anoAtual}-06-15". Se disser "próximo sábado", calcule a data real.
2. Valores monetários: extraia apenas o número. "3 mil" = 3000, "R$ 500" = 500, "mil e quinhentos" = 1500.
3. Horários: formato HH:MM. "16h" = "16:00", "às 10" = "10:00".
4. Cliente: se mencionar um nome que existe na lista acima, use o id correspondente. Se for nome novo, deixe cliente_id como null.
5. Tipos de evento aceitos: Casamento, Ensaio, Formatura, Newborn, Aniversário, Família, Corporativo, Book, Gestante.

FORMATO DE RESPOSTA (escolha a ação correta):

Para CRIAR EVENTO:
{"acao":"criar_evento","dados":{"tipo_evento":"Casamento","cliente_nome":"Ana Silva","cliente_id":"ID_SE_EXISTIR_OU_NULL","data":"${anoAtual}-06-15","horario":"16:00","valor_total":3000,"valor_pago":500,"forma_pagamento":"pix","parcelas":1,"local":"Igreja São Paulo","observacoes":""},"resumo":"📸 Casamento\\n👤 Ana Silva\\n📅 15/06/${anoAtual} às 16h\\n📍 Igreja São Paulo\\n💰 R$3.000,00\\n✅ Entrada: R$500,00"}

Para CRIAR CLIENTE:
{"acao":"criar_cliente","dados":{"cliente_nome":"João Souza","telefone":"37999990000","email":""},"resumo":"👤 Novo cliente: João Souza\\n📱 (37) 99999-0000"}

Para LISTAR CLIENTES:
{"acao":"listar_clientes","dados":{},"resumo":""}

Para LISTAR EVENTOS:
{"acao":"listar_eventos","dados":{},"resumo":""}

Para CONVERSA SIMPLES:
{"acao":"conversa","dados":{},"resumo":"","resposta":"Sua resposta aqui"}

IMPORTANTE: Retorne APENAS o JSON, sem nenhum texto antes ou depois.`;

  try {
    const text = await callGemini(prompt, geminiKey);
    const clean = text.trim().replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      console.log('JSON parse error:', e.message, '\nRaw:', clean.slice(0, 200));
      return res.json({
        message: '🤔 Não entendi bem. Tente ser mais específico.\n\nExemplos:\n• "Casamento da Ana 15/06 às 16h R$3000 entrada 500"\n• "Novo cliente João telefone 37999990000"\n• "Quais meus eventos?"'
      });
    }

    const { acao, dados, resumo, resposta } = parsed;

    // Listar clientes
    if (acao === 'listar_clientes') {
      const all = await Client.find({ userId: req.user._id }).sort({ name: 1 });
      if (!all.length) return res.json({ message: '📋 Nenhum cliente cadastrado ainda.\n\nDiga: "Novo cliente Ana Silva telefone 37999990000"' });
      const lista = all.slice(0, 20).map(c => `• ${c.name}${c.phone ? ` — ${c.phone}` : ''}`).join('\n');
      return res.json({ message: `👥 Seus clientes (${all.length}):\n${lista}` });
    }

    // Listar eventos
    if (acao === 'listar_eventos') {
      const all = await Event.find({ userId: req.user._id, eventDate: { $gte: new Date() } }).sort({ eventDate: 1 }).limit(10);
      if (!all.length) return res.json({ message: '📅 Nenhum evento futuro agendado.' });
      const lista = all.map(e => `• ${e.eventType} — ${e.clientName} — ${e.eventDate ? new Date(e.eventDate).toLocaleDateString('pt-BR') : 'Sem data'}`).join('\n');
      return res.json({ message: `📅 Próximos eventos:\n${lista}` });
    }

    // Criar evento ou cliente — pede confirmação
    if (acao === 'criar_evento' || acao === 'criar_cliente') {
      if (!resumo) {
        return res.json({ message: '❓ Não consegui entender os detalhes. Tente novamente com mais informações.' });
      }
      return res.json({
        message: `📋 Entendi! Veja se está correto:\n\n${resumo}\n\nConfirmar?`,
        acao_pendente: acao,
        dados,
        botoes: ['✅ Confirmar', '✏️ Editar'],
      });
    }

    // Conversa simples
    const msgResposta = resposta || resumo ||
      `👋 Olá, ${req.user.name.split(' ')[0]}! Como posso ajudar?\n\nExemplos:\n• "Casamento da Ana 15/06 às 16h R$3000"\n• "Novo cliente João 37999990000"\n• "Meus eventos de hoje"`;
    res.json({ message: msgResposta });

  } catch (e) {
    console.error('Chat error:', e.message);
    if (e.message.includes('quota') || e.message.includes('429')) {
      return res.json({ message: '⚠️ Limite da API Gemini atingido. Tente novamente em alguns minutos.' });
    }
    res.json({ message: '❌ Erro ao processar. Tente novamente.' });
  }
});

// ── CONFIRMAR AÇÃO ───────────────────────────────────
router.post('/confirmar', requireNormalOrPro, async (req, res) => {
  const { acao_pendente, dados } = req.body;

  // ── Criar cliente ──
  if (acao_pendente === 'criar_cliente') {
    if (!dados?.cliente_nome) return res.status(400).json({ error: 'Nome obrigatório' });
    const c = await Client.create({
      userId: req.user._id,
      name:   dados.cliente_nome,
      phone:  dados.telefone || '',
      email:  dados.email || '',
    });
    return res.json({ message: `✅ Cliente **${c.name}** cadastrado com sucesso!` });
  }

  // ── Criar evento ──
  if (acao_pendente === 'criar_evento') {
    let clientId   = dados.cliente_id;
    let clientName = dados.cliente_nome || '';

    // Busca ou cria o cliente
    if (!clientId && clientName) {
      let c = await Client.findOne({ userId: req.user._id, name: new RegExp(`^${clientName}$`, 'i') });
      if (!c) c = await Client.findOne({ userId: req.user._id, name: new RegExp(clientName, 'i') });
      if (!c) c = await Client.create({ userId: req.user._id, name: clientName });
      clientId   = c._id;
      clientName = c.name;
    }

    if (!clientId) return res.status(400).json({ error: 'Cliente não identificado. Informe o nome do cliente.' });

    // Monta data/hora
    let eventDate = null;
    if (dados.data) {
      try {
        const hora = dados.horario || '09:00';
        eventDate = new Date(`${dados.data}T${hora}:00`);
        if (isNaN(eventDate)) eventDate = null;
      } catch { eventDate = null; }
    }

    const total = parseFloat(dados.valor_total) || 0;
    const pago  = parseFloat(dados.valor_pago)  || 0;
    const saldo = Math.max(0, total - pago);

    const evento = await Event.create({
      userId:       req.user._id,
      clientId,
      clientName,
      eventType:    dados.tipo_evento || 'Sessão',
      eventDate,
      location:     dados.local || '',
      totalValue:   total,
      amountPaid:   pago,
      installments: parseInt(dados.parcelas) || 1,
      paymentType:  dados.forma_pagamento || 'pix',
      notes:        dados.observacoes || '',
    });

    const dataFmt = eventDate
      ? eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'Sem data';
    const horaFmt = dados.horario ? ` às ${dados.horario}` : '';

    return res.json({
      message: `✅ Evento criado com sucesso!\n\n📸 ${evento.eventType} — ${clientName}\n📅 ${dataFmt}${horaFmt}\n📍 ${dados.local || 'Sem local'}\n💰 Total: R$${total.toFixed(2)}\n✅ Pago: R$${pago.toFixed(2)}\n⏳ Saldo: R$${saldo.toFixed(2)}`,
    });
  }

  res.status(400).json({ error: 'Ação não reconhecida' });
});

module.exports = router;
