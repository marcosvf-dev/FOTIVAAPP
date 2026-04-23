const router = require('express').Router();
const { auth, requireActive } = require('../middleware/auth');
const { Client, Event } = require('../models/models');

router.use(auth, requireActive);

// ── GEMINI ─────────────────────────────────────────
async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Erro Gemini');
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── FALLBACK COM REGRAS ─────────────────────────────
function parseWithRules(message, clients) {
  const msg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const result = {
    acao: 'conversa',
    dados: { tipo_evento:null, cliente_nome:null, cliente_id:null, data:null,
             horario:null, valor_total:null, valor_pago:null,
             forma_pagamento:null, parcelas:null, local:null, observacoes:null },
    resumo: '', resposta: '',
  };

  // LISTAR
  if (/list|ver|mostrar|quais|meus (cliente|evento)/.test(msg)) {
    if (/cliente/.test(msg)) { result.acao = 'listar_clientes'; return result; }
    if (/evento|agenda|proximo/.test(msg)) { result.acao = 'listar_eventos'; return result; }
  }

  // NOVO CLIENTE
  if (/novo cliente|adicionar cliente|cadastrar cliente|cliente novo/.test(msg)) {
    result.acao = 'criar_cliente';
    const nomeM = message.match(/cliente[:\s]+([A-ZÀ-Ú][a-zA-ZÀ-ú\s]{2,30})/i);
    if (nomeM) result.dados.cliente_nome = nomeM[1].trim();
    const telM = message.match(/(\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4})/);
    if (telM) result.dados.telefone = telM[1];
    result.resumo = `Novo cliente: ${result.dados.cliente_nome || '?'}`;
    return result;
  }

  // CRIAR EVENTO — detecta tipo
  const tipos = {
    casamento: /casamento|noivado|bodas/,
    ensaio:    /ensaio|sessao|session|book/,
    formatura: /formatura|colacao|formandos/,
    newborn:   /newborn|bebe|recem.nascido|gestante/,
    aniversario:/aniversario|festa|birthday|15 anos|debutante/,
    familia:   /familia|family/,
    corporativo:/corporativo|empresa|corporate|produto|comercial/,
  };

  let tipoDetectado = null;
  for (const [tipo, regex] of Object.entries(tipos)) {
    if (regex.test(msg)) { tipoDetectado = tipo.charAt(0).toUpperCase() + tipo.slice(1); break; }
  }

  // Detecta valor total — "R$3000", "3 mil", "3000 reais"
  const valorM = message.match(/R?\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:reais|,00)?/i)
    || message.match(/(\d+)\s*mil/i);
  let valorTotal = null;
  if (valorM) {
    valorTotal = parseFloat(valorM[1].replace(/\./g,'').replace(',','.'));
    if (/mil/i.test(message)) valorTotal *= 1000;
  }

  // Detecta valor pago / entrada
  const pagoM = message.match(/(?:pago|entrada|sinal|pagou|adiantamento)[^\d]*R?\$?\s*(\d+(?:[.,]\d+)?)/i);
  const valorPago = pagoM ? parseFloat(pagoM[1].replace(',','.')) : null;

  // Detecta data — "23/05", "23 de maio", "15/06/2026"
  const dataM = message.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
    || message.match(/(\d{1,2})\s+de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i);
  let dataISO = null;
  if (dataM) {
    const meses = {jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};
    const dia = dataM[1];
    const mes = isNaN(dataM[2]) ? meses[dataM[2].toLowerCase()] : parseInt(dataM[2]);
    const ano = dataM[3] ? (dataM[3].length===2?'20'+dataM[3]:dataM[3]) : new Date().getFullYear();
    dataISO = `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
  }

  // Detecta horário
  const horaM = message.match(/(\d{1,2})h(\d{2})?|(\d{1,2}):(\d{2})/i);
  let horario = null;
  if (horaM) horario = `${(horaM[1]||horaM[3]).padStart(2,'0')}:${(horaM[2]||horaM[4]||'00')}`;

  // Detecta nome do cliente
  let clienteNome = null, clienteId = null;
  const preposicoes = ['da','do','de','dos','das','para','com'];
  for (const prep of preposicoes) {
    const r = new RegExp(`${prep}\\s+([A-ZÀ-Ú][a-zA-ZÀ-ú]{2,}(?:\\s+[A-ZÀ-Ú][a-zA-ZÀ-ú]{2,})?)`, 'i');
    const m2 = message.match(r);
    if (m2) {
      clienteNome = m2[1].trim();
      // Tenta encontrar na lista
      const found = clients.find(c => c.name.toLowerCase().includes(clienteNome.toLowerCase()) ||
        clienteNome.toLowerCase().includes(c.name.toLowerCase().split(' ')[0]));
      if (found) { clienteId = found._id; clienteNome = found.name; }
      break;
    }
  }

  // Se tem tipo de evento ou valor, cria evento
  if (tipoDetectado || valorTotal) {
    result.acao = 'criar_evento';
    result.dados.tipo_evento   = tipoDetectado || 'Sessão';
    result.dados.cliente_nome  = clienteNome;
    result.dados.cliente_id    = clienteId;
    result.dados.data          = dataISO;
    result.dados.horario       = horario;
    result.dados.valor_total   = valorTotal;
    result.dados.valor_pago    = valorPago;
    result.resumo = [
      `📸 ${result.dados.tipo_evento}`,
      clienteNome ? `👤 ${clienteNome}` : null,
      dataISO ? `📅 ${new Date(dataISO+'T12:00:00').toLocaleDateString('pt-BR')}` : null,
      horario ? `🕐 ${horario}` : null,
      valorTotal ? `💰 R$${valorTotal.toFixed(2)}` : null,
      valorPago ? `✅ Entrada: R$${valorPago.toFixed(2)}` : null,
    ].filter(Boolean).join('\n');
    return result;
  }

  // Conversa simples
  const saudacoes = /^(oi|ola|bom dia|boa tarde|boa noite|ei|hey|hello|tudo bem|como vai)/;
  if (saudacoes.test(msg)) {
    result.resposta = `Olá, ${req?.user?.name?.split(' ')[0] || ''}! 👋 Como posso ajudar?\n\nVocê pode me dizer:\n• "Casamento da Ana 23/05 R$3000"\n• "Novo cliente João 11999990000"\n• "Quais meus eventos?"`;
  } else {
    result.resposta = '🤔 Não entendi. Tente:\n• "Ensaio da Maria 15/06 às 10h R$800"\n• "Novo cliente Pedro"\n• "Meus clientes"';
  }
  return result;
}

// ── ROTA PRINCIPAL ──────────────────────────────────
router.post('/', requireActive, requireNormalOrPro, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Mensagem vazia' });

  const clients = await Client.find({ userId: req.user._id }).select('name _id').limit(100);
  const clientsList = clients.map(c => `${c.name}(id:${c._id})`).join(', ') || 'Nenhum';

  let parsed = null;
  const geminiKey = process.env.GEMINI_API_KEY;

  // Tenta Gemini primeiro
  if (geminiKey && !geminiKey.includes('placeholder')) {
    try {
      const hoje = new Date().toLocaleDateString('pt-BR');
      const ano  = new Date().getFullYear();
      const prompt = `Assistente FOTIVA para fotografo brasileiro.
Fotografo: ${req.user.name}. Clientes: ${clientsList}. Hoje: ${hoje}.
Mensagem: "${message}"

Responda SOMENTE com JSON valido sem markdown:
{"acao":"criar_evento"|"criar_cliente"|"listar_clientes"|"listar_eventos"|"conversa","dados":{"tipo_evento":null,"cliente_nome":null,"cliente_id":null,"data":null,"horario":null,"valor_total":null,"valor_pago":null,"forma_pagamento":null,"parcelas":null,"local":null,"observacoes":null},"resumo":"resumo em portugues","resposta":"resposta se conversa"}

Regras: datas YYYY-MM-DD, valores numero puro, horario HH:MM. Tipos: Casamento/Ensaio/Formatura/Newborn/Aniversario/Familia/Corporativo`;

      const text = await callGemini(prompt, geminiKey);
      parsed = JSON.parse(text.trim().replace(/```json|```/g,'').trim());
    } catch (e) {
      console.log('Gemini falhou, usando regras:', e.message);
      parsed = null;
    }
  }

  // Fallback para regras
  if (!parsed) {
    parsed = parseWithRules(message, clients);
    // Injeta req no fallback para saudacao personalizada
    if (parsed.acao === 'conversa' && parsed.resposta.includes('{{nome}}')) {
      parsed.resposta = parsed.resposta.replace('{{nome}}', req.user.name.split(' ')[0]);
    }
  }

  const { acao, dados, resumo, resposta } = parsed;

  if (acao === 'listar_clientes') {
    const all = await Client.find({ userId: req.user._id }).sort({ name: 1 });
    if (!all.length) return res.json({ message: '📋 Nenhum cliente ainda.\n\nDiga: "Novo cliente Ana Silva, tel 11999990000"' });
    return res.json({ message: `👥 Seus clientes (${all.length}):\n${all.slice(0,20).map(c=>`• ${c.name}${c.phone?` — ${c.phone}`:''}`).join('\n')}` });
  }

  if (acao === 'listar_eventos') {
    const all = await Event.find({ userId: req.user._id, eventDate: { $gte: new Date() } }).sort({ eventDate: 1 }).limit(10);
    if (!all.length) return res.json({ message: '📅 Nenhum evento futuro.' });
    return res.json({ message: `📅 Próximos eventos:\n${all.map(e=>`• ${e.eventType} — ${e.clientName} — ${e.eventDate?new Date(e.eventDate).toLocaleDateString('pt-BR'):'Sem data'}`).join('\n')}` });
  }

  if (acao === 'criar_evento' || acao === 'criar_cliente') {
    return res.json({ message: `📋 Entendi!\n\n${resumo}\n\nConfirmar?`, acao_pendente: acao, dados, botoes: ['✅ Confirmar','✏️ Editar'] });
  }

  res.json({ message: resposta || resumo || '👋 Como posso ajudar?\n\nExemplos:\n• "Casamento da Ana 23/05 R$3000"\n• "Novo cliente João"\n• "Meus eventos"' });
});

// ── CONFIRMAR AÇÃO ──────────────────────────────────
router.post('/confirmar', requireActive, requireNormalOrPro, async (req, res) => {
  const { acao_pendente, dados } = req.body;

  if (acao_pendente === 'criar_cliente') {
    if (!dados?.cliente_nome) return res.status(400).json({ error: 'Nome obrigatório' });
    const c = await Client.create({
      userId: req.user._id,
      name:   dados.cliente_nome,
      phone:  dados.telefone || '',
      email:  dados.email || '',
    });
    return res.json({ message: `✅ Cliente **${c.name}** cadastrado!` });
  }

  if (acao_pendente === 'criar_evento') {
    let clientId = dados.cliente_id, clientName = dados.cliente_nome || '';
    if (!clientId && clientName) {
      let c = await Client.findOne({ userId: req.user._id, name: new RegExp(clientName,'i') });
      if (!c) c = await Client.create({ userId: req.user._id, name: clientName });
      clientId = c._id; clientName = c.name;
    }
    if (!clientId) return res.status(400).json({ error: 'Cliente não encontrado. Informe o nome.' });

    let eventDate = null;
    if (dados.data) { try { eventDate = new Date(`${dados.data}T${dados.horario||'09:00'}:00`); } catch {} }
    const total = parseFloat(dados.valor_total) || 0;
    const pago  = parseFloat(dados.valor_pago)  || 0;

    const e = await Event.create({
      userId: req.user._id, clientId, clientName,
      eventType:    dados.tipo_evento || 'Sessão',
      eventDate,
      location:     dados.local || '',
      totalValue:   total,
      amountPaid:   pago,
      installments: dados.parcelas || 1,
      paymentType:  dados.forma_pagamento || 'pix',
      notes:        dados.observacoes || '',
    });

    return res.json({
      message: `✅ Evento criado!\n\n📸 ${e.eventType} — ${clientName}\n📅 ${eventDate ? eventDate.toLocaleDateString('pt-BR') : 'Sem data'}${dados.horario ? ` às ${dados.horario}` : ''}\n📍 ${dados.local || 'Sem local'}\n💰 Total: R$${total.toFixed(2)} | Pago: R$${pago.toFixed(2)} | Saldo: R$${(total-pago).toFixed(2)}`,
    });
  }

  res.status(400).json({ error: 'Ação não reconhecida' });
});

module.exports = router;
