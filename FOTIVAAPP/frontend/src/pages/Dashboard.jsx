import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Calendar, Users, Clock, Plus, TrendingUp } from 'lucide-react';
import api from '../lib/api';

const Icon3D = ({ color, glow, children }) => (
  <div style={{
    width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `rgba(${color},0.12)`, border: `1px solid rgba(${color},0.2)`,
    boxShadow: `0 4px 16px rgba(${color},0.15)`,
  }}>
    {children}
  </div>
);

const MetricCard = ({ label, value, trend, icon: Icon, color, rgb, onClick }) => (
  <div onClick={onClick} style={{
    background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16,
    padding: '20px', cursor: onClick ? 'pointer' : 'default', transition: 'all .2s',
    position: 'relative', overflow: 'hidden',
  }}
  onMouseEnter={e => { if(onClick) e.currentTarget.style.borderColor = `rgba(${rgb},0.3)`; }}
  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
    <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: `rgba(${rgb},0.06)` }} />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
      <Icon3D color={rgb}><Icon size={20} color={color} /></Icon3D>
    </div>
    <div style={{ color: '#666', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
    <div style={{ color: '#fff', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>{value}</div>
    {trend && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22C55E', fontSize: 12 }}>
        <TrendingUp size={13} /> {trend}
      </div>
    )}
  </div>
);

const statusColor = (diff) => {
  if (diff <= 0) return '#ef4444';
  if (diff <= 1) return '#f97316';
  if (diff <= 7) return '#eab308';
  return '#22C55E';
};

const statusLabel = (diff) => {
  if (diff <= 0) return 'Hoje!';
  if (diff === 1) return 'Amanhã';
  if (diff <= 7) return `Em ${diff}d`;
  return null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/dashboard/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v) => `R$${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Olá, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#555', fontSize: 14, marginTop: 4 }}>Visão geral do seu estúdio</p>
        </div>
        <button className="f-btn f-btn-primary" onClick={() => navigate('/eventos/novo')} style={{ gap: 8 }}>
          <Plus size={16} /> Novo Evento
        </button>
      </div>

      {/* Metric cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 28 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 140, background: '#111', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 28 }}>
          <MetricCard label="Faturamento do mês"   value={fmt(stats?.totalRevenue)}   icon={DollarSign} color="#E87722" rgb="232,119,34" trend="Este mês" onClick={() => navigate('/pagamentos')} />
          <MetricCard label="Eventos futuros"       value={stats?.totalEvents || 0}    icon={Calendar}   color="#3B82F6" rgb="59,130,246" trend="Próximos 30 dias" onClick={() => navigate('/eventos')} />
          <MetricCard label="Total de clientes"     value={stats?.totalClients || 0}   icon={Users}      color="#A855F7" rgb="168,85,247" onClick={() => navigate('/clientes')} />
          <MetricCard label="Pagamentos pendentes"  value={fmt(stats?.pendingPayments)} icon={Clock}     color="#EF4444" rgb="239,68,68"  onClick={() => navigate('/pagamentos')} />
        </div>
      )}

      {/* Upcoming events */}
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Próximos Eventos</h2>
            <p style={{ color: '#555', fontSize: 12, marginTop: 3 }}>Ordenados por data</p>
          </div>
          <button className="f-btn f-btn-ghost" onClick={() => navigate('/eventos')} style={{ padding: '7px 14px', fontSize: 13 }}>Ver todos</button>
        </div>

        {!stats?.upcomingEvents?.length ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Calendar size={40} color="#2A2A2A" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: '#444', fontSize: 14 }}>Nenhum evento agendado</p>
            <button className="f-btn f-btn-primary" onClick={() => navigate('/eventos/novo')} style={{ marginTop: 14, padding: '8px 18px', fontSize: 13 }}>
              <Plus size={14} /> Criar evento
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.upcomingEvents.map(ev => {
              const date = new Date(ev.eventDate);
              const diff = Math.ceil((date - new Date()) / 864e5);
              const sc   = statusColor(diff);
              const sl   = statusLabel(diff);
              return (
                <div key={ev._id} onClick={() => navigate(`/eventos/editar/${ev._id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: '#161616', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,119,34,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                  <div style={{ width: 42, height: 42, background: `rgba(${diff <= 1 ? '239,68,68' : '232,119,34'},0.12)`, borderRadius: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: diff <= 1 ? '#ef4444' : '#E87722', fontSize: 14, fontWeight: 800, lineHeight: 1 }}>{date.getDate()}</span>
                    <span style={{ color: diff <= 1 ? '#ef4444' : '#E87722', fontSize: 9, fontWeight: 600, textTransform: 'uppercase' }}>{date.toLocaleString('pt-BR',{month:'short'})}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#ddd', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.eventType}</div>
                    <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>{ev.clientName} · {ev.location || 'Local não definido'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <div style={{ color: '#888', fontSize: 12 }}>{date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
                    {sl && <span style={{ background: `rgba(${sc === '#ef4444' ? '239,68,68' : sc === '#f97316' ? '249,115,22' : '234,179,8'},0.15)`, color: sc, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{sl}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
