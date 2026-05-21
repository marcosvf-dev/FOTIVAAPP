import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, Trash2, MapPin, DollarSign, ChevronDown, ChevronUp, Archive, Image } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Contrato from '../components/Contrato';

const STATUS_FLOW = [
  { id:'orcamento',        label:'Orçamento',       color:'#A855F7', bg:'rgba(168,85,247,0.15)',  icon:'💬', step:1 },
  { id:'contrato_enviado', label:'Contrato Enviado', color:'#3B82F6', bg:'rgba(59,130,246,0.15)', icon:'📄', step:2 },
  { id:'sinal_recebido',   label:'Sinal Recebido',  color:'#F59E0B', bg:'rgba(245,158,11,0.15)', icon:'💰', step:3 },
  { id:'confirmado',       label:'Confirmado',      color:'#22C55E', bg:'rgba(34,197,94,0.15)',  icon:'✅', step:4 },
  { id:'realizado',        label:'Realizado',       color:'#E87722', bg:'rgba(232,119,34,0.15)', icon:'📸', step:5 },
  { id:'fotos_entregues',  label:'Fotos Entregues', color:'#06B6D4', bg:'rgba(6,182,212,0.15)',  icon:'🖼', step:6 },
  { id:'concluido',        label:'Concluído',       color:'#10B981', bg:'rgba(16,185,129,0.15)', icon:'🏆', step:7 },
  { id:'cancelado',        label:'Cancelado',       color:'#EF4444', bg:'rgba(239,68,68,0.15)',  icon:'❌', step:0 },
];

const getStatus  = (id) => STATUS_FLOW.find(s => s.id === id) || STATUS_FLOW[3];
const nextStatus = (current) => {
  const flow = STATUS_FLOW.filter(s => s.id !== 'cancelado');
  const idx  = flow.findIndex(s => s.id === current);
  return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
};

function gerarMensagem({ ev, user }) {
  const dataObj = ev.eventDate ? new Date(ev.eventDate) : null;
  const data  = dataObj && !isNaN(dataObj) ? dataObj.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
  const hora  = dataObj && !isNaN(dataObj) ? dataObj.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '';
  const saldo = Math.max(0,(ev.totalValue||0)-(ev.amountPaid||0));
  const statusMsgs = {
    orcamento:       `Segue o orçamento para o seu ${ev.eventType} 📋\n\nFico à disposição para tirar qualquer dúvida!`,
    contrato_enviado:`Olá! Acabei de enviar o contrato do seu ${ev.eventType} 📄\n\nPor favor, revise com calma e me retorne quando puder.`,
    sinal_recebido:  `Recebi o sinal! 💰✨\n\nSeu ${ev.eventType} está oficialmente reservado. Obrigado pela confiança!`,
    confirmado:      `Confirmo nosso ${ev.eventType}! 📸✨\n\nEstou muito animado(a) para este dia especial!`,
    realizado:       `Que dia incrível! 💛\n\nFoi uma honra fotografar seu ${ev.eventType}. As fotos já estão sendo editadas com todo carinho.`,
    fotos_entregues: `Suas fotos do ${ev.eventType} foram entregues! 🖼️📸\n\nEspero que ame o resultado tanto quanto eu amei capturar esses momentos.`,
    concluido:       `Obrigado(a) pela confiança no seu ${ev.eventType}! 🏆\n\nFoi um prazer trabalhar com você. Conte comigo sempre!`,
    cancelado:       `Sobre o ${ev.eventType} que estava agendado, vamos conversar?`,
  };
  let txt = `Olá ${ev.clientName}! 😊\n\n${statusMsgs[ev.status]||''}\n\n`;
  if (data) txt += `📅 Data: ${data}${hora?` às ${hora}`:''}\n`;
  if (ev.location) txt += `📍 Local: ${ev.location}\n`;
  if (ev.totalValue > 0) {
    txt += `\n💰 Financeiro\n• Total: R$${ev.totalValue.toLocaleString('pt-BR',{minimumFractionDigits:2})}\n`;
    if (ev.amountPaid > 0) txt += `• Entrada: R$${ev.amountPaid.toLocaleString('pt-BR',{minimumFractionDigits:2})}\n`;
    if (saldo > 0) txt += `• Saldo: R$${saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})}\n`;
  }
  txt += `\nQualquer dúvida estou à disposição! 🙂\n_${user?.name||''}${user?.studioName?` — ${user.studioName}`:''}_  📸`;
  return txt;
}

function WhatsModalRapido({ ev, user, onClose }) {
  const [phone, setPhone] = useState('');
  const [msg,   setMsg]   = useState(() => gerarMensagem({ ev, user }));

  const abrir = () => {
    const n = phone.replace(/\D/g,'');
    if (!n) { toast.error('Informe o número do cliente'); return; }
    window.open(`https://wa.me/55${n}?text=${encodeURIComponent(msg)}`, '_blank');
    onClose();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:24, width:'100%', maxWidth:500, maxHeight:'90vh', overflow:'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h2 style={{ color:'#fff', fontSize:17, fontWeight:800, margin:0 }}>💬 WhatsApp — {ev.clientName}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Número do cliente (DDD + número)</label>
          <input type="tel" placeholder="Ex: 37999990000" value={phone} onChange={e => setPhone(e.target.value)}
            style={{ width:'100%', background:'#161616', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#fff', padding:'10px 14px', fontSize:14, outline:'none', fontFamily:'inherit' }}/>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Mensagem (editável)</label>
          <textarea value={msg} onChange={e => setMsg(e.target.value)}
            style={{ width:'100%', background:'#161616', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#ddd', padding:'12px 14px', fontSize:13, outline:'none', minHeight:180, resize:'vertical', lineHeight:1.7, fontFamily:'inherit' }}/>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => { navigator.clipboard.writeText(msg); toast.success('Copiado!'); }}
            style={{ flex:1, padding:'11px', borderRadius:10, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'#aaa', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>📋 Copiar</button>
          <button onClick={abrir}
            style={{ flex:2, padding:'11px', borderRadius:10, background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>💬 Abrir no WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

// Modal para criar galeria vinculada ao evento
function CriarGaleriaModal({ ev, onClose, onCreated }) {
  const [form,    setForm]    = useState({ password: '', downloadEnabled: false, watermarkEnabled: false });
  const [loading, setLoading] = useState(false);

  const criar = async () => {
    if (!form.password.trim()) { toast.error('Crie uma senha para o cliente acessar a galeria'); return; }
    setLoading(true);
    try {
      await api.post('/api/gallery/photographer', {
        title:            `${ev.eventType} — ${ev.clientName}`,
        description:      ev.eventDate ? `Evento em ${new Date(ev.eventDate).toLocaleDateString('pt-BR')}` : '',
        clientName:       ev.clientName,
        clientEmail:      ev.clientEmail || '',
        password:         form.password,
        downloadEnabled:  form.downloadEnabled,
        watermarkEnabled: form.watermarkEnabled,
        eventId:          ev._id,
      });
      toast.success('Galeria criada!');
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao criar galeria');
    }
    setLoading(false);
  };

  const inpStyle = { width:'100%', background:'#161616', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, color:'#fff', padding:'10px 14px', fontSize:14, outline:'none', fontFamily:'inherit' };
  const OR = '#E87722';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.88)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.1)', borderRadius:20, padding:28, width:'100%', maxWidth:420 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ color:'#fff', fontSize:17, fontWeight:800, margin:0 }}>📸 Criar Galeria</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>

        <div style={{ background:'rgba(232,119,34,.08)', border:'1px solid rgba(232,119,34,.2)', borderRadius:10, padding:'10px 14px', marginBottom:18, fontSize:13, color:'#E87722' }}>
          <strong>{ev.eventType}</strong> — {ev.clientName}
          {ev.eventDate && <span style={{ color:'#666', marginLeft:8 }}>{new Date(ev.eventDate).toLocaleDateString('pt-BR')}</span>}
        </div>

        {!ev.clientEmail && (
          <div style={{ background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#F59E0B' }}>
            ⚠️ Este cliente não tem email cadastrado. O link da galeria precisará ser enviado manualmente.
          </div>
        )}

        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Senha de acesso para o cliente *</label>
          <input type="password" placeholder="Crie uma senha para o cliente" value={form.password}
            onChange={e => setForm(f => ({...f, password: e.target.value}))} style={inpStyle}/>
          <div style={{ color:'#444', fontSize:11, marginTop:4 }}>O cliente usará esta senha para acessar as fotos</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
          {[
            ['downloadEnabled',  'Permitir download', 'Cliente pode baixar as fotos', '#3B82F6'],
            ['watermarkEnabled', "Marca d'água",      'Adiciona seu nome nas fotos',  '#A855F7'],
          ].map(([key, label, sub, color]) => (
            <div key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,.03)', borderRadius:10, padding:'10px 14px', border:'1px solid rgba(255,255,255,.06)' }}>
              <div>
                <div style={{ color:'#ddd', fontSize:13, fontWeight:600 }}>{label}</div>
                <div style={{ color:'#555', fontSize:11, marginTop:2 }}>{sub}</div>
              </div>
              <button onClick={() => setForm(f => ({...f, [key]: !f[key]}))}
                style={{ background:'none', border:'none', cursor:'pointer', padding:0, fontSize:22 }}>
                {form[key] ? '🟢' : '⚫'}
              </button>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'11px', borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'#888', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Cancelar
          </button>
          <button onClick={criar} disabled={loading}
            style={{ flex:2, padding:'11px', borderRadius:10, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:loading?.6:1 }}>
            {loading ? 'Criando...' : '📸 Criar Galeria'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Eventos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventos,       setEventos]       = useState([]);
  const [contratoId,    setContratoId]    = useState(null);
  const [whatsEv,       setWhatsEv]       = useState(null);
  const [galeriaEv,     setGaleriaEv]     = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [filter,        setFilter]        = useState('todos');
  const [expanded,      setExpanded]      = useState({});
  const [statusLoading, setStatusLoading] = useState({});
  const [showArchived,  setShowArchived]  = useState(false);

  const load = async () => {
    try {
      const r = await api.get('/api/events');
      setEventos(r.data);
    } catch { toast.error('Erro ao carregar eventos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = eventos.filter(e => {
    if (!showArchived && e.archived) return false;
    if (showArchived && !e.archived) return false;
    const matchSearch = e.eventType?.toLowerCase().includes(search.toLowerCase()) || e.clientName?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'todos' || e.status === filter;
    return matchSearch && matchFilter;
  });

  const remove = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Excluir "${name}"?\n\nIsto apagará o evento e todos os dados financeiros permanentemente.`)) return;
    try { await api.delete(`/api/events/${id}`); toast.success('Evento removido'); load(); }
    catch { toast.error('Erro ao remover'); }
  };

  const archive = async (e, ev) => {
    e.stopPropagation();
    const acao = ev.archived ? 'desarquivar' : 'arquivar';
    if (!window.confirm(`${acao.charAt(0).toUpperCase() + acao.slice(1)} "${ev.eventType} — ${ev.clientName}"?\n\nOs dados financeiros serão mantidos.`)) return;
    try {
      await api.patch(`/api/events/${ev._id}/archive`, { archived: !ev.archived });
      toast.success(ev.archived ? '📂 Evento restaurado!' : '📁 Evento arquivado!');
      load();
    } catch { toast.error('Erro ao arquivar'); }
  };

  const advanceStatus = async (e, ev) => {
    e.stopPropagation();
    const next = nextStatus(ev.status);
    if (!next) return;
    setStatusLoading(p => ({ ...p, [ev._id]: true }));
    try { await api.patch(`/api/events/${ev._id}/status`, { status: next.id }); toast.success(`${next.icon} ${next.label}`); load(); }
    catch { toast.error('Erro ao atualizar status'); }
    finally { setStatusLoading(p => ({ ...p, [ev._id]: false })); }
  };

  const changeStatus = async (evId, newStatus) => {
    setStatusLoading(p => ({ ...p, [evId]: true }));
    try {
      await api.patch(`/api/events/${evId}/status`, { status: newStatus });
      const s = getStatus(newStatus);
      toast.success(`${s.icon} ${s.label}`);
      load();
    } catch { toast.error('Erro ao atualizar status'); }
    finally { setStatusLoading(p => ({ ...p, [evId]: false })); setExpanded(p => ({ ...p, [evId]: false })); }
  };

  const archivedCount = eventos.filter(e => e.archived).length;
  const filters = [['todos','Todos'],['orcamento','Orçamento'],['confirmado','Confirmados'],['realizado','Realizados'],['fotos_entregues','Fotos Entregues'],['concluido','Concluídos']];

  return (
    <Layout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, letterSpacing:'-0.4px' }}>Eventos</h1>
          <p style={{ color:'#555', fontSize:13, marginTop:4 }}>
            {eventos.filter(e => !e.archived).length} evento{eventos.filter(e=>!e.archived).length !== 1 ? 's' : ''} ativo{eventos.filter(e=>!e.archived).length !== 1 ? 's' : ''}
            {archivedCount > 0 && <span style={{ color:'#444', marginLeft:8 }}>· {archivedCount} arquivado{archivedCount>1?'s':''}</span>}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {archivedCount > 0 && (
            <button onClick={() => setShowArchived(a => !a)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, background: showArchived ? 'rgba(168,85,247,.15)' : 'rgba(255,255,255,.05)', border: showArchived ? '1px solid rgba(168,85,247,.3)' : '1px solid rgba(255,255,255,.08)', color: showArchived ? '#A855F7' : '#666', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              <Archive size={14}/> {showArchived ? 'Ver ativos' : `Arquivados (${archivedCount})`}
            </button>
          )}
          <button className="f-btn f-btn-primary" onClick={() => navigate('/eventos/novo')}>
            <Plus size={16}/> Novo Evento
          </button>
        </div>
      </div>

      <div style={{ position:'relative', marginBottom:14 }}>
        <Search size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#444' }}/>
        <input className="f-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por tipo ou cliente..." style={{ paddingLeft:38 }}/>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:18, flexWrap:'wrap' }}>
        {filters.map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding:'7px 13px', borderRadius:8, fontSize:11, fontWeight:600, border:'none', cursor:'pointer',
              background: filter===v ? 'linear-gradient(135deg,#E87722,#C85A00)' : '#1A1A1A',
              color: filter===v ? '#fff' : '#666', boxShadow: filter===v ? '0 4px 12px rgba(232,119,34,0.3)' : 'none' }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:100, background:'#111', borderRadius:14, animation:'pulse 1.5s infinite' }}/>)}
        </div>
      ) : !filtered.length ? (
        <div style={{ textAlign:'center', padding:'52px 0' }}>
          <Calendar size={44} color="#222" style={{ margin:'0 auto 14px', display:'block' }}/>
          <p style={{ color:'#444', fontSize:15 }}>
            {showArchived ? 'Nenhum evento arquivado' : 'Nenhum evento encontrado'}
          </p>
          {!search && !showArchived && (
            <button className="f-btn f-btn-primary" onClick={() => navigate('/eventos/novo')} style={{ marginTop:16 }}>
              <Plus size={15}/> Criar evento
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(ev => {
            const date      = ev.eventDate ? new Date(ev.eventDate) : null;
            const s         = getStatus(ev.status);
            const next      = nextStatus(ev.status);
            const remaining = Math.max(0,(ev.totalValue||0)-(ev.amountPaid||0));
            const isExp     = expanded[ev._id];
            return (
              <div key={ev._id} style={{ background: ev.archived ? '#0d0d0d' : '#111', border:`1px solid ${ev.archived ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,0.06)'}`, borderRadius:14, overflow:'hidden', opacity: ev.archived ? .7 : 1 }}>
                {ev.status !== 'cancelado' && !ev.archived && (
                  <div style={{ height:3, background:'rgba(255,255,255,0.04)' }}>
                    <div style={{ height:'100%', width:`${(s.step/7)*100}%`, background:`linear-gradient(90deg,#E87722,${s.color})`, transition:'width .4s ease' }}/>
                  </div>
                )}
                <div style={{ padding:'10px 14px', cursor:'pointer' }} onClick={() => !ev.archived && navigate(`/eventos/${ev._id}`)}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:38, height:38, background: ev.archived ? 'rgba(255,255,255,.04)' : 'rgba(232,119,34,0.1)', border:`1px solid ${ev.archived ? 'rgba(255,255,255,.08)' : 'rgba(232,119,34,0.2)'}`, borderRadius:12, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {ev.archived ? (
                        <Archive size={18} color="#555"/>
                      ) : date ? (
                        <>
                          <span style={{ color:'#E87722', fontSize:13, fontWeight:800, lineHeight:1 }}>{date.getDate()}</span>
                          <span style={{ color:'#E87722', fontSize:8, fontWeight:600, textTransform:'uppercase' }}>{date.toLocaleString('pt-BR',{month:'short'})}</span>
                        </>
                      ) : <Calendar size={18} color="#E87722"/>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                        <span style={{ color: ev.archived ? '#666' : '#fff', fontWeight:700, fontSize:14 }}>{ev.eventType}</span>
                        {ev.archived ? (
                          <span style={{ background:'rgba(168,85,247,.1)', color:'#A855F7', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, border:'1px solid rgba(168,85,247,.2)' }}>📁 Arquivado</span>
                        ) : (
                          <span style={{ background:s.bg, color:s.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, border:`1px solid ${s.color}33`, whiteSpace:'nowrap' }}>{s.icon} {s.label}</span>
                        )}
                      </div>
                      <div style={{ color:'#888', fontSize:12, marginBottom:5, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span>{ev.clientName}</span>
                        {date && <span style={{ color:'#E87722', fontSize:11, fontWeight:600, background:'rgba(232,119,34,.08)', padding:'1px 7px', borderRadius:10 }}>🕐 {date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>}
                      </div>
                      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                        {ev.location && (
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <span style={{ color:'#555', fontSize:12, display:'flex', alignItems:'center', gap:4 }}><MapPin size={11}/>{ev.location.length > 25 ? ev.location.slice(0,25)+'...' : ev.location}</span>
                            {!ev.archived && (
                              <div style={{ display:'flex', gap:3 }} onClick={e => e.stopPropagation()}>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`} target="_blank" rel="noreferrer" style={{ fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:5, background:'rgba(66,133,244,.15)', color:'#4285F4', border:'1px solid rgba(66,133,244,.25)', textDecoration:'none' }}>Maps</a>
                                <a href={`https://waze.com/ul?q=${encodeURIComponent(ev.location)}&navigate=yes`} target="_blank" rel="noreferrer" style={{ fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:5, background:'rgba(0,162,197,.15)', color:'#00A2C5', border:'1px solid rgba(0,162,197,.25)', textDecoration:'none' }}>Waze</a>
                              </div>
                            )}
                          </div>
                        )}
                        {ev.totalValue > 0 && <span style={{ color:'#555', fontSize:12, display:'flex', alignItems:'center', gap:4 }}><DollarSign size={11}/>R${ev.totalValue.toLocaleString('pt-BR')}</span>}
                        {remaining > 0 && !ev.archived && <span style={{ color:'#E87722', fontSize:12, fontWeight:600 }}>Saldo: R${remaining.toLocaleString('pt-BR')}</span>}
                        {ev.archived && ev.totalValue > 0 && <span style={{ color:'#444', fontSize:12 }}>Financeiro mantido no histórico</span>}
                      </div>
                    </div>

                    {/* Botões de ação */}
                    <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                      {/* Arquivar / Restaurar */}
                      <button onClick={e => archive(e, ev)}
                        title={ev.archived ? 'Restaurar evento' : 'Arquivar evento (mantém financeiro)'}
                        style={{ padding:7, background: ev.archived ? 'rgba(168,85,247,.1)' : 'rgba(255,255,255,.05)', border:`1px solid ${ev.archived ? 'rgba(168,85,247,.3)' : 'rgba(255,255,255,.08)'}`, borderRadius:8, color: ev.archived ? '#A855F7' : '#666', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Archive size={13}/>
                      </button>
                      {/* Excluir permanentemente */}
                      <button onClick={e => remove(e, ev._id, ev.eventType)}
                        title="Excluir permanentemente"
                        style={{ padding:7, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:8, color:'#ef4444', cursor:'pointer', display:'flex' }}>
                        <Trash2 size={13}/>
                      </button>
                      {!ev.archived && (
                        <>
                          <button onClick={e => { e.stopPropagation(); setContratoId(ev._id); }}
                            style={{ padding:'5px 8px', background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.15)', color:'#22C55E', borderRadius:8, fontSize:10, fontWeight:700, cursor:'pointer' }}>📄</button>
                          <button onClick={e => { e.stopPropagation(); setWhatsEv(ev); }}
                            style={{ padding:'5px 8px', background:'rgba(37,211,102,.08)', border:'1px solid rgba(37,211,102,.2)', color:'#25D366', borderRadius:8, fontSize:10, fontWeight:700, cursor:'pointer' }}>💬</button>
                          <button onClick={e => { e.stopPropagation(); setGaleriaEv(ev); }}
                            title="Criar galeria para este evento"
                            style={{ padding:'5px 8px', background:'rgba(232,119,34,.08)', border:'1px solid rgba(232,119,34,.2)', color:'#E87722', borderRadius:8, fontSize:10, fontWeight:700, cursor:'pointer' }}>📸</button>
                        </>
                      )}
                    </div>
                  </div>

                  {!ev.archived && (
                    <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }} onClick={e => e.stopPropagation()}>
                      {next && (
                        <button onClick={e => advanceStatus(e, ev)} disabled={statusLoading[ev._id]}
                          style={{ flex:1, padding:'6px 10px', borderRadius:8, background:`linear-gradient(135deg,${next.color}22,${next.color}11)`, border:`1px solid ${next.color}44`, color:next.color, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:statusLoading[ev._id]?.6:1, fontFamily:'inherit', minWidth:140 }}>
                          {statusLoading[ev._id] ? '...' : `${next.icon} → ${next.label}`}
                        </button>
                      )}
                      <button onClick={() => setExpanded(p => ({ ...p, [ev._id]: !p[ev._id] }))}
                        style={{ padding:'8px 12px', borderRadius:9, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', color:'#666', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
                        {isExp ? <ChevronUp size={13}/> : <ChevronDown size={13}/>} Alterar
                      </button>
                    </div>
                  )}

                  {isExp && !ev.archived && (
                    <div style={{ marginTop:8, display:'flex', gap:5, flexWrap:'wrap' }} onClick={e => e.stopPropagation()}>
                      {STATUS_FLOW.map(st => (
                        <button key={st.id} onClick={() => changeStatus(ev._id, st.id)}
                          style={{ padding:'5px 10px', borderRadius:8, border:`1px solid ${st.color}44`, background: ev.status===st.id ? `${st.color}22` : 'transparent', color: ev.status===st.id ? st.color : '#555', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                          {st.icon} {st.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {contratoId && <Contrato eventoId={contratoId} onClose={() => setContratoId(null)}/>}
      {whatsEv    && <WhatsModalRapido ev={whatsEv} user={user} onClose={() => setWhatsEv(null)}/>}
      {galeriaEv  && <CriarGaleriaModal ev={galeriaEv} onClose={() => setGaleriaEv(null)} onCreated={load}/>}
    </Layout>
  );
}
