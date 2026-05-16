import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const TIPOS = ['Casamento','Ensaio','Aniversário','Formatura','Corporativo','Book','Família','Gestante','Newborn','Outro'];
const PAGAMENTOS = [['pix','Pix'],['dinheiro','Dinheiro'],['transferencia','Transferência'],['credito','Crédito'],['debito','Débito']];

const STATUS_FLOW = [
  { id:'orcamento',        label:'Orçamento',       color:'#A855F7', icon:'💬' },
  { id:'contrato_enviado', label:'Contrato Enviado', color:'#3B82F6', icon:'📄' },
  { id:'sinal_recebido',   label:'Sinal Recebido',  color:'#F59E0B', icon:'💰' },
  { id:'confirmado',       label:'Confirmado',      color:'#22C55E', icon:'✅' },
  { id:'realizado',        label:'Realizado',       color:'#E87722', icon:'📸' },
  { id:'fotos_entregues',  label:'Fotos Entregues', color:'#06B6D4', icon:'🖼' },
  { id:'concluido',        label:'Concluído',       color:'#10B981', icon:'🏆' },
  { id:'cancelado',        label:'Cancelado',       color:'#EF4444', icon:'❌' },
];

function gerarMensagemWhatsApp({ evento, fotógrafo }) {
  const { clientName, eventType, eventDate, location, totalValue, amountPaid, status } = evento;
  const nome    = fotógrafo?.name       || '';
  const estudio = fotógrafo?.studioName || '';
  const data    = eventDate ? new Date(eventDate).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
  const hora    = eventDate ? new Date(eventDate).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) : '';
  const saldo   = Math.max(0, (totalValue||0) - (amountPaid||0));

  const statusMsgs = {
    orcamento:        `Segue o orçamento para o seu *${eventType}*. Fico à disposição para esclarecer qualquer dúvida!`,
    contrato_enviado: `Enviei o contrato do seu *${eventType}*. Por favor revise e retorne com sua assinatura.`,
    sinal_recebido:   `Confirmei o recebimento do sinal! Seu *${eventType}* está reservado na minha agenda. 🎉`,
    confirmado:       `Confirmo nosso *${eventType}*! Estou animado(a) para este dia especial. 📸`,
    realizado:        `Foi uma honra fotografar seu *${eventType}*! As fotos estão sendo editadas com muito carinho. 💛`,
    fotos_entregues:  `Suas fotos do *${eventType}* foram entregues! Espero que curta cada momento eternizado. 🖼`,
    concluido:        `Que alegria ter feito parte do seu *${eventType}*! Obrigado(a) pela confiança. 🏆`,
    cancelado:        `Referente ao *${eventType}* que estava agendado.`,
  };

  let txt = `Olá *${clientName}*! 😊\n\n${statusMsgs[status] || ''}\n\n`;
  if (data) txt += `📅 *Data:* ${data}${hora ? ` às ${hora}` : ''}\n`;
  if (location) txt += `📍 *Local:* ${location}\n`;
  if (totalValue > 0) {
    txt += `\n💰 *Financeiro:*\n`;
    txt += `• Valor total: *R$${totalValue.toLocaleString('pt-BR',{minimumFractionDigits:2})}*\n`;
    if (amountPaid > 0) txt += `• Entrada recebida: *R$${amountPaid.toLocaleString('pt-BR',{minimumFractionDigits:2})}*\n`;
    if (saldo > 0) txt += `• Saldo restante: *R$${saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})}*\n`;
  }
  txt += `\nQualquer dúvida estou à disposição! 🙂\n`;
  txt += `_${nome}${estudio ? ` — ${estudio}` : ''}_ 📸`;
  return txt;
}

function WhatsAppModal({ evento, fotógrafo, clientePhone, onClose }) {
  const mensagem = gerarMensagemWhatsApp({ evento, fotógrafo });
  const [msg,   setMsg]   = useState(mensagem);
  const [phone, setPhone] = useState(clientePhone || '');

  const abrirWhatsApp = () => {
    const numero = phone.replace(/\D/g,'');
    if (!numero) { toast.error('Informe o número do WhatsApp do cliente'); return; }
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(msg)}`, '_blank');
    onClose();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:28, width:'100%', maxWidth:520, maxHeight:'90vh', overflow:'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ color:'#fff', fontSize:18, fontWeight:800, margin:0 }}>💬 Mensagem WhatsApp</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Número do cliente (DDD + número)</label>
          <input type="tel" placeholder="Ex: 37999990000" value={phone} onChange={e => setPhone(e.target.value)}
            style={{ width:'100%', background:'#161616', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#fff', padding:'10px 14px', fontSize:14, outline:'none', fontFamily:'inherit' }}/>
          <p style={{ color:'#444', fontSize:11, marginTop:4 }}>Somente números, com DDD (sem +55)</p>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Mensagem (você pode editar antes de enviar)</label>
          <textarea value={msg} onChange={e => setMsg(e.target.value)}
            style={{ width:'100%', background:'#161616', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#ddd', padding:'12px 14px', fontSize:13, outline:'none', minHeight:220, resize:'vertical', lineHeight:1.7, fontFamily:'inherit' }}/>
        </div>
        <div style={{ background:'#1a1a1a', borderRadius:12, padding:16, marginBottom:20, border:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:11, color:'#555', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>Preview</div>
          <div style={{ background:'#075E54', borderRadius:12, padding:'12px 16px' }}>
            <pre style={{ color:'#fff', fontSize:13, whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0, fontFamily:'inherit', lineHeight:1.6 }}>{msg}</pre>
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => { navigator.clipboard.writeText(msg); toast.success('Mensagem copiada!'); }}
            style={{ flex:1, padding:'12px', borderRadius:10, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'#aaa', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            📋 Copiar
          </button>
          <button onClick={abrirWhatsApp}
            style={{ flex:2, padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            💬 Abrir no WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

function EventoForm({ initialData, onSubmit, loading, title }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientes,     setClientes]     = useState([]);
  const [whatsModal,   setWhatsModal]   = useState(false);
  const [clientePhone, setClientePhone] = useState('');

  const [form, setForm] = useState({
    clientId:'', clientName:'', eventType:'', eventDate:'', eventTime:'09:00',
    location:'', status:'confirmado', totalValue:'', amountPaid:'0',
    installments:'1', paymentType:'pix', dueDay:'', firstDueDate:'', notes:'',
    ...initialData
  });

  useEffect(() => {
    api.get('/api/clients', { params: { limit: 500 } }).then(r => {
      // API pode retornar array direto ou { clients: [...], pagination: {...} }
      const lista = Array.isArray(r.data) ? r.data : (r.data.clients || []);
      setClientes(lista);
      if (form.clientId) {
        const c = lista.find(x => x._id === form.clientId);
        if (c?.phone) setClientePhone(c.phone.replace(/\D/g,''));
      }
    }).catch(() => {});
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      eventDate: form.eventDate && form.eventTime ? `${form.eventDate}T${form.eventTime}:00` : form.eventDate || null,
      totalValue:   parseFloat(form.totalValue)   || 0,
      amountPaid:   parseFloat(form.amountPaid)   || 0,
      installments: parseInt(form.installments)   || 1,
      dueDay:       parseInt(form.dueDay)         || null,
      firstDueDate: form.firstDueDate             || null,
    };
    delete payload.eventTime;
    onSubmit(payload);
  };

  const labelStyle  = { display:'block', fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 };
  const inputStyle  = { width:'100%', background:'#161616', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, color:'#ddd', padding:'10px 14px', fontSize:14, outline:'none', transition:'all .15s' };
  const sectionStyle = { background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:22, marginBottom:16 };
  const onFocus = e => { e.target.style.borderColor='#E87722'; e.target.style.boxShadow='0 0 0 3px rgba(232,119,34,0.15)'; };
  const onBlur  = e => { e.target.style.borderColor='rgba(255,255,255,0.07)'; e.target.style.boxShadow='none'; };

  const remaining      = Math.max(0, (parseFloat(form.totalValue)||0) - (parseFloat(form.amountPaid)||0));
  const selectedStatus = STATUS_FLOW.find(s => s.id === form.status) || STATUS_FLOW[3];

  const eventoParaWhats = {
    clientName: form.clientName || clientes.find(c => c._id === form.clientId)?.name || '',
    eventType:  form.eventType  || '',
    eventDate:  form.eventDate && form.eventTime ? `${form.eventDate}T${form.eventTime}:00` : form.eventDate || null,
    location:   form.location   || '',
    totalValue: parseFloat(form.totalValue)  || 0,
    amountPaid: parseFloat(form.amountPaid)  || 0,
    status:     form.status     || 'confirmado',
  };

  return (
    <Layout>
      <div style={{ maxWidth:680, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
          <button onClick={() => navigate(-1)} style={{ background:'#161616', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:9, color:'#888', cursor:'pointer', display:'flex' }}>
            <ArrowLeft size={18}/>
          </button>
          <div style={{ flex:1 }}>
            <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, letterSpacing:'-0.4px' }}>{title}</h1>
            <p style={{ color:'#555', fontSize:13, marginTop:3 }}>Preencha os dados do evento</p>
          </div>
          {form.eventType && (form.clientName || form.clientId) && (
            <button onClick={() => setWhatsModal(true)}
              style={{ padding:'9px 16px', borderRadius:10, background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontFamily:'inherit', flexShrink:0 }}>
              💬 WhatsApp
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={sectionStyle}>
            <h3 style={{ color:'#E87722', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:16 }}>Cliente</h3>
            <div>
              <label style={labelStyle}>Selecionar cliente</label>
              <select value={form.clientId} onChange={e => {
                const c = clientes.find(x => x._id === e.target.value);
                set('clientId', e.target.value);
                set('clientName', c?.name || '');
                if (c?.phone) setClientePhone(c.phone.replace(/\D/g,''));
              }} style={{ ...inputStyle, cursor:'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                <option value="">Selecione um cliente...</option>
                {clientes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            {!form.clientId && (
              <div style={{ marginTop:12 }}>
                <label style={labelStyle}>Ou digite o nome do cliente</label>
                <input style={inputStyle} type="text" placeholder="Nome do cliente" value={form.clientName}
                  onChange={e => set('clientName', e.target.value)} onFocu
