import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, Trash2, MapPin, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
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

const getStatus = (id) => STATUS_FLOW.find(s => s.id === id) || STATUS_FLOW[3];

const nextStatus = (current) => {
  const flow = STATUS_FLOW.filter(s => s.id !== 'cancelado');
  const idx  = flow.findIndex(s => s.id === current);
  return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
};

export default function Eventos() {
  const navigate = useNavigate();
  const [eventos,       setEventos]      = useState([]);
  const [contratoId,    setContratoId]   = useState(null);
  const [loading,       setLoading]      = useState(true);
  const [search,        setSearch]       = useState('');
  const [filter,        setFilter]       = useState('todos');
  const [expanded,      setExpanded]     = useState({});
  const [statusLoading, setStatusLoading] = useState({});

  const load = async () => {
    try { const r = await api.get('/api/events'); setEventos(r.data); }
    catch { toast.error('Erro ao carregar eventos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = eventos.filter(e => {
    const matchSearch = e.eventType?.toLowerCase().includes(search.toLowerCase()) ||
                        e.clientName?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'todos' || e.status === filter;
    return matchSearch && matchFilter;
  });

  const remove = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Excluir "${name}"?`)) return;
    try { await api.delete(`/api/events/${id}`); toast.success('Evento removido'); load(); }
    catch { toast.error('Erro ao remover'); }
  };

  const advanceStatus = async (e, ev) => {
    e.stopPropagation();
    const next = nextStatus(ev.status);
    if (!next) return;
    setStatusLoading(p => ({ ...p, [ev._id]: true }));
    try {
      await api.patch(`/api/events/${ev._id}/status`, { status: next.id });
      toast.success(`${next.icon} ${next.label}`);
      load();
    } catch { toast.error('Erro ao atualizar status'); }
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
    finally {
      setStatusLoading(p => ({ ...p, [evId]: false }));
      setExpanded(p => ({ ...p, [evId]: false }));
    }
  };

  const filters = [
    ['todos','Todos'],['orcamento','Orçamento'],['confirmado','Confirmados'],
    ['realizado','Realizados'],['fotos_entregues','Fotos Entregues'],['concluido','Concluídos'],
  ];

  return (
    <Layout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, letterSpacing:'-0.4px' }}>Eventos</h1>
          <p style={{ color:'#555', fontSize:13, marginTop:4 }}>{eventos.length} evento{eventos.length !== 1 ? 's' : ''} cadastrado{eventos.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="f-btn f-btn-primary" onClick={() => navigate('/eventos/novo')}><Plus size={16}/> Novo Evento</button>
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
              color: filter===v ? '#fff' : '#666',
              boxShadow: filter===v ? '0 4px 12px rgba(232,119,34,0.3)' : 'none',
            }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:100, background:'#111', borderRadius:14, animation:'pulse 1.5s infinite' }}/>)}
        </div>
      ) : !filtered.length ? (
        <div style={{ textAlign:'center', padding:'52px 0' }}>
          <Calendar size={44} color="#222" style={{ margin:'0 auto 14px', display:'block' }}/>
          <p style={{ color:'#444', fontSize:15 }}>Nenhum evento encontrado</p>
          {!search && <button className="f-btn f-btn-primary" onClick={() => navigate('/eventos/novo')} style={{ marginTop:16 }}><Plus size={15}/> Criar evento</button>}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(ev => {
            const date      = ev.eventDate ? new Date(ev.eventDate) : null;
            const s         = getStatus(ev.status);
            const next      = nextStatus(ev.status);
            const remaining = Math.max(0, (ev.totalValue||0) - (ev.amountPaid||0));
            const isExp     = expanded[ev._id];

            return (
              <div key={ev._id} style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, overflow:'hidden' }}>

                {ev.status !== 'cancelado' && (
                  <div style={{ height:3, background:'rgba(255,255,255,0.04)' }}>
                    <div style={{ height:'100%', width:`${(s.step/7)*100}%`, background:`linear-gradient(90deg,#E87722,${s.color})`, transition:'width .4s ease' }}/>
                  </div>
                )}

                <div style={{ padding:'14px 16px', cursor:'pointer' }} onClick={() => navigate(`/eventos/editar/${ev._id}`)}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:44, height:44, background:'rgba(232,119,34,0.1)', border:'1px solid rgba(232,119,34,0.2)', borderRadius:12, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {date ? <>
                        <span style={{ color:'#E87722', fontSize:15, fontWeight:800, lineHeight:1 }}>{date.getDate()}</span>
                        <span style={{ color:'#E87722', fontSize:9, fontWeight:600, textTransform:'uppercase' }}>{date.toLocaleString('pt-BR',{month:'short'})}</span>
                      </> : <Calendar size={18} color="#E87722"/>}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                        <span style={{ color:'#fff', fontWeight:700, fontSize:15 }}>{ev.eventType}</span>
                        <span style={{ background:s.bg, color:s.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, border:`1px solid ${s.color}33`, whiteSpace:'nowrap' }}>
                          {s.icon} {s.label}
                        </span>
                      </div>
                      <div style={{ color:'#888', fontSize:13, marginBottom:6 }}>{ev.clientName}</div>
                      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                        {ev.location && (
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <span style={{ color:'#555', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                              <MapPin size={11}/>{ev.location.length > 25 ? ev.location.slice(0,25)+'...' : ev.location}
                            </span>
                            <div style={{ display:'flex', gap:3 }} onClick={e => e.stopPropagation()}>
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`} target="_blank" rel="noreferrer"
                                style={{ fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:5, background:'rgba(66,133,244,.15)', color:'#4285F4', border:'1px solid rgba(66,133,244,.25)', textDecoration:'none' }}>Maps</a>
                              <a href={`https://waze.com/ul?q=${encodeURIComponent(ev.location)}&navigate=yes`} target="_blank" rel="noreferrer"
                                style={{ fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:5, background:'rgba(0,162,197,.15)', color:'#00A2C5', border:'1px solid rgba(0,162,197,.25)', textDecoration:'none' }}>Waze</a>
                            </div>
                          </div>
                        )}
                        {ev.totalValue > 0 && <span style={{ color:'#555', fontSize:12, display:'flex', alignItems:'center', gap:4 }}><DollarSign size={11}/>R${ev.totalValue.toLocaleString('pt-BR')}</span>}
                        {remaining > 0 && <span style={{ color:'#E87722', fontSize:12, fontWeight:600 }}>Saldo: R${remaining.toLocaleString('pt-BR')}</span>}
                      </div>
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                      <button onClick={e => remove(e, ev._id, ev.eventType)}
                        style={{ padding:7, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:8, color:'#ef4444', cursor:'pointer', display:'flex' }}>
                        <Trash2 size={13}/>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setContratoId(ev._id); }}
                        style={{ padding:'5px 8px', background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.15)', color:'#22C55E', borderRadius:8, fontSize:10, fontWeight:700, cursor:'pointer' }}>
                        📄
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop:10, display:'flex', gap:7, flexWrap:'wrap' }} onClick={e => e.stopPropagation()}>
                    {next && (
                      <button onClick={e => advanceStatus(e, ev)} disabled={statusLoading[ev._id]}
                        style={{ flex:1, padding:'8px 12px', borderRadius:9, background:`linear-gradient(135deg,${next.color}22,${next.color}11)`, border:`1px solid ${next.color}44`, color:next.color, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity:statusLoading[ev._id]?.6:1, fontFamily:'inherit', minWidth:140 }}>
                        {statusLoading[ev._id] ? '...' : `${next.icon} → ${next.label}`}
                      </button>
                    )}
                    <button onClick={() => setExpanded(p => ({ ...p, [ev._id]: !p[ev._id] }))}
                      style={{ padding:'8px 12px', borderRadius:9, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', color:'#666', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
                      {isExp ? <ChevronUp size={13}/> : <ChevronDown size={13}/>} Alterar
                    </button>
                  </div>

                  {isExp && (
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
    </Layout>
  );
}
