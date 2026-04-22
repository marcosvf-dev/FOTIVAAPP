import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, Edit2, Trash2, MapPin, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const STATUS = { confirmado: ['#22C55E','rgba(34,197,94,0.15)'], pendente: ['#E87722','rgba(232,119,34,0.15)'], cancelado: ['#ef4444','rgba(239,68,68,0.15)'], concluido: ['#3B82F6','rgba(59,130,246,0.15)'] };

export default function Eventos() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('todos');

  const fetch = async () => {
    try { const r = await api.get('/api/events'); setEventos(r.data); }
    catch { toast.error('Erro ao carregar eventos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const filtered = eventos.filter(e => {
    const matchSearch = e.eventType?.toLowerCase().includes(search.toLowerCase()) || e.clientName?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'todos' || e.status === filter;
    return matchSearch && matchFilter;
  });

  const remove = async (id, name) => {
    if (!window.confirm(`Excluir "${name}"?`)) return;
    try { await api.delete(`/api/events/${id}`); toast.success('Evento removido'); fetch(); }
    catch { toast.error('Erro ao remover'); }
  };

  const cardStyle = { background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px', transition: 'all .15s', cursor: 'pointer' };
  const filters = [['todos','Todos'], ['confirmado','Confirmados'], ['pendente','Pendentes'], ['concluido','Concluídos']];

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.4px' }}>Eventos</h1>
          <p style={{ color: '#555', fontSize: 13, marginTop: 4 }}>{eventos.length} evento{eventos.length !== 1 ? 's' : ''} cadastrado{eventos.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="f-btn f-btn-primary" onClick={() => navigate('/eventos/novo')}><Plus size={16} /> Novo Evento</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
          <input className="f-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar eventos..." style={{ paddingLeft: 38 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {filters.map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all .15s',
                background: filter === v ? 'linear-gradient(135deg,#E87722,#C85A00)' : '#1A1A1A',
                color: filter === v ? '#fff' : '#666',
                boxShadow: filter === v ? '0 4px 12px rgba(232,119,34,0.3)' : 'none',
              }}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 100, background: '#111', borderRadius: 14, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : !filtered.length ? (
        <div style={{ textAlign: 'center', padding: '52px 0' }}>
          <Calendar size={44} color="#222" style={{ margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: '#444', fontSize: 15 }}>Nenhum evento encontrado</p>
          {!search && <button className="f-btn f-btn-primary" onClick={() => navigate('/eventos/novo')} style={{ marginTop: 16 }}><Plus size={15} /> Criar evento</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(ev => {
            const date = ev.eventDate ? new Date(ev.eventDate) : null;
            const [sc, sbg] = STATUS[ev.status] || ['#888','rgba(136,136,136,0.1)'];
            const remaining = Math.max(0, (ev.totalValue||0) - (ev.amountPaid||0));
            return (
              <div key={ev._id} style={cardStyle} onClick={() => navigate(`/eventos/editar/${ev._id}`)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,119,34,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 46, height: 46, background: 'rgba(232,119,34,0.1)', border: '1px solid rgba(232,119,34,0.2)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {date ? <>
                      <span style={{ color: '#E87722', fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{date.getDate()}</span>
                      <span style={{ color: '#E87722', fontSize: 9, fontWeight: 600, textTransform: 'uppercase' }}>{date.toLocaleString('pt-BR',{month:'short'})}</span>
                    </> : <Calendar size={18} color="#E87722" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{ev.eventType}</span>
                      <span style={{ background: sbg, color: sc, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: `1px solid ${sc}33` }}>{ev.status}</span>
                    </div>
                    <div style={{ color: '#888', fontSize: 13 }}>{ev.clientName}</div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
                      {ev.location && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                          <span style={{ color:'#555', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                            <MapPin size={11}/>{ev.location}
                          </span>
                          <div style={{ display:'flex', gap:4 }}>
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`} target="_blank" rel="noreferrer"
                              onClick={e=>e.stopPropagation()}
                              style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:6, background:'rgba(66,133,244,.15)', color:'#4285F4', border:'1px solid rgba(66,133,244,.25)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:3 }}>
                              🗺 Maps
                            </a>
                            <a href={`https://waze.com/ul?q=${encodeURIComponent(ev.location)}&navigate=yes`} target="_blank" rel="noreferrer"
                              onClick={e=>e.stopPropagation()}
                              style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:6, background:'rgba(0,162,197,.15)', color:'#00A2C5', border:'1px solid rgba(0,162,197,.25)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:3 }}>
                              🚗 Waze
                            </a>
                          </div>
                        </div>
                      )}
                      {ev.totalValue > 0 && <span style={{ color: '#555', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={11} />R${ev.totalValue.toLocaleString('pt-BR')}</span>}
                      {remaining > 0 && <span style={{ color: '#E87722', fontSize: 12, fontWeight: 600 }}>Saldo: R${remaining.toLocaleString('pt-BR')}</span>}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); remove(ev._id, ev.eventType); }}
                    style={{ padding: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
