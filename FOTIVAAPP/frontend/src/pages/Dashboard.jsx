import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Calendar, Users, Clock, Plus, TrendingUp, TrendingDown, BarChart2, Gift } from 'lucide-react';
import api from '../lib/api';

const OR = '#E87722';

function fmtMoney(v) {
  return 'R$' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

const MetricCard = ({ label, value, sub, icon: Icon, color, rgb, onClick, trend, trendUp }) => (
  <div onClick={onClick} style={{
    background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16,
    padding:'20px', cursor: onClick ? 'pointer' : 'default', transition:'all .2s',
    position:'relative', overflow:'hidden',
  }}
  onMouseEnter={e => { if(onClick) e.currentTarget.style.borderColor=`rgba(${rgb},0.3)`; }}
  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; }}>
    <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:`rgba(${rgb},0.06)` }}/>
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
      <div style={{ width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.2)` }}>
        <Icon size={20} color={color}/>
      </div>
      {trend !== undefined && (
        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color: trendUp ? '#22C55E' : '#EF4444' }}>
          {trendUp ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
          {trend}
        </div>
      )}
    </div>
    <div style={{ color:'#666', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{label}</div>
    <div style={{ color:'#fff', fontSize:26, fontWeight:800, letterSpacing:'-0.5px', marginBottom: sub ? 4 : 0 }}>{value}</div>
    {sub && <div style={{ color:'#555', fontSize:12 }}>{sub}</div>}
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

const STATUS_FLOW = {
  orcamento:        { label:'Orçamento',       color:'#A855F7' },
  contrato_enviado: { label:'Contrato',         color:'#3B82F6' },
  sinal_recebido:   { label:'Sinal',            color:'#F59E0B' },
  confirmado:       { label:'Confirmado',       color:'#22C55E' },
  realizado:        { label:'Realizado',        color:OR },
  fotos_entregues:  { label:'Fotos Entregues',  color:'#06B6D4' },
  concluido:        { label:'Concluído',        color:'#10B981' },
  cancelado:        { label:'Cancelado',        color:'#EF4444' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats,      setStats]      = useState(null);
  const [extraStats, setExtraStats] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [verGrafico,      setVerGrafico]      = useState(false);
  const [aniversariantes, setAniversariantes] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/api/dashboard/stats'),
      api.get('/api/dashboard/extra').catch(() => ({ data: null })),
      api.get('/api/clients/aniversariantes').catch(() => ({ data: [] })),
    ]).then(([r1, r2, r3]) => {
      setStats(r1.data);
      setExtraStats(r2.data);
      setAniversariantes(r3.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const maxGraf = Math.max(...(extraStats?.receitaMensal || []).map(m => m.total), 1);

  return (
    <Layout>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:14 }}>
        <div>
          <h1 style={{ color:'#fff', fontSize:26, fontWeight:800, letterSpacing:'-0.5px' }}>
            Olá, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color:'#555', fontSize:14, marginTop:4 }}>Visão geral do seu estúdio</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setVerGrafico(g => !g)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, background: verGrafico ? `linear-gradient(135deg,${OR},#C85A00)` : 'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)', color: verGrafico ? '#fff' : '#888', fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
            <BarChart2 size={15}/> Gráfico
          </button>
          <button onClick={() => navigate('/eventos/novo')}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:10, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            <Plus size={16}/> Novo Evento
          </button>
        </div>
      </div>

      {/* Metric cards */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginBottom:28 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height:140, background:'#111', borderRadius:16, border:'1px solid rgba(255,255,255,0.05)', animation:'pulse 1.5s infinite' }}/>
          ))}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginBottom:28 }}>
          <MetricCard
            label="Faturamento do mês" value={fmtMoney(stats?.totalRevenue)}
            sub={extraStats?.variacaoReceita ? `${extraStats.variacaoReceita > 0 ? '+' : ''}${extraStats.variacaoReceita.toFixed(0)}% vs mês anterior` : undefined}
            icon={DollarSign} color={OR} rgb="232,119,34"
            trend={extraStats?.variacaoReceita ? `${extraStats.variacaoReceita > 0 ? '+' : ''}${extraStats.variacaoReceita.toFixed(0)}%` : undefined}
            trendUp={extraStats?.variacaoReceita > 0}
            onClick={() => navigate('/pagamentos')}
          />
          <MetricCard
            label="Eventos futuros" value={stats?.totalEvents || 0}
            sub="Próximos 30 dias"
            icon={Calendar} color="#3B82F6" rgb="59,130,246"
            onClick={() => navigate('/eventos')}
          />
          <MetricCard
            label="Total de clientes" value={stats?.totalClients || 0}
            sub={extraStats?.novosClientesMes ? `+${extraStats.novosClientesMes} este mês` : undefined}
            icon={Users} color="#A855F7" rgb="168,85,247"
            onClick={() => navigate('/clientes')}
          />
          <MetricCard
            label="Pagamentos pendentes" value={fmtMoney(stats?.pendingPayments)}
            sub={extraStats?.parcelasAtrasadas ? `⚠️ ${extraStats.parcelasAtrasadas} em atraso` : undefined}
            icon={Clock} color="#EF4444" rgb="239,68,68"
            onClick={() => navigate('/pagamentos')}
          />
        </div>
      )}

      {/* Gráfico de receita mensal */}
      {verGrafico && extraStats?.receitaMensal?.length > 0 && (
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ color:'#888', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:16 }}>
            Receita dos últimos 6 meses
          </div>
          <div style={{ display:'flex', gap:8, height:120, alignItems:'flex-end', marginBottom:8 }}>
            {extraStats.receitaMensal.map((m, i) => (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ color:'#666', fontSize:9, fontWeight:600 }}>
                  {fmtMoney(m.total).replace('R$','')}
                </div>
                <div style={{
                  width:'100%',
                  background:`linear-gradient(180deg,${OR},#C85A00)`,
                  borderRadius:'4px 4px 0 0',
                  height:`${Math.max(8,(m.total/maxGraf)*100)}px`,
                  transition:'height .5s',
                }}/>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {extraStats.receitaMensal.map((m, i) => (
              <div key={i} style={{ flex:1, textAlign:'center', color:'#444', fontSize:9, fontWeight:600 }}>{m.label}</div>
            ))}
          </div>
        </div>
      )}

      {/* Funil de status dos eventos */}
      {extraStats?.eventosPorStatus && Object.keys(extraStats.eventosPorStatus).length > 0 && (
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ color:'#888', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:16 }}>
            Eventos por Status
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {Object.entries(extraStats.eventosPorStatus).map(([status, count]) => {
              const s = STATUS_FLOW[status] || { label: status, color:'#888' };
              return (
                <div key={status} style={{ background:`${s.color}15`, border:`1px solid ${s.color}33`, borderRadius:10, padding:'10px 16px', textAlign:'center', minWidth:80 }}>
                  <div style={{ color:s.color, fontSize:20, fontWeight:900 }}>{count}</div>
                  <div style={{ color:'#666', fontSize:10, marginTop:3 }}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Próximos Eventos */}
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'20px', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div>
            <h2 style={{ color:'#fff', fontSize:16, fontWeight:700 }}>Próximos Eventos</h2>
            <p style={{ color:'#555', fontSize:12, marginTop:3 }}>Ordenados por data</p>
          </div>
          <button onClick={() => navigate('/eventos')}
            style={{ padding:'7px 14px', borderRadius:9, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#888', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            Ver todos
          </button>
        </div>

        {!stats?.upcomingEvents?.length ? (
          <div style={{ textAlign:'center', padding:'32px 0' }}>
            <Calendar size={40} color="#2A2A2A" style={{ margin:'0 auto 12px', display:'block' }}/>
            <p style={{ color:'#444', fontSize:14 }}>Nenhum evento agendado</p>
            <button onClick={() => navigate('/eventos/novo')}
              style={{ marginTop:14, padding:'8px 18px', borderRadius:9, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, margin:'14px auto 0' }}>
              <Plus size={14}/> Criar evento
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {stats.upcomingEvents.map(ev => {
              const date = new Date(ev.eventDate);
              const diff = Math.ceil((date - new Date()) / 864e5);
              const sc   = statusColor(diff);
              const sl   = statusLabel(diff);
              return (
                <div key={ev._id} onClick={() => navigate(`/eventos/editar/${ev._id}`)}
                  style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', background:'#161616', borderRadius:12, border:'1px solid rgba(255,255,255,0.04)', cursor:'pointer', transition:'all .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='rgba(232,119,34,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.04)'}>
                  <div style={{ width:42, height:42, background:`rgba(${diff<=1?'239,68,68':'232,119,34'},0.12)`, borderRadius:11, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ color:diff<=1?'#ef4444':OR, fontSize:14, fontWeight:800, lineHeight:1 }}>{date.getDate()}</span>
                    <span style={{ color:diff<=1?'#ef4444':OR, fontSize:9, fontWeight:600, textTransform:'uppercase' }}>{date.toLocaleString('pt-BR',{month:'short'})}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:'#ddd', fontSize:14, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.eventType}</div>
                    <div style={{ color:'#555', fontSize:12, marginTop:2 }}>{ev.clientName} · {ev.location || 'Local não definido'}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                    <div style={{ color:'#888', fontSize:12 }}>{date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
                    {sl && <span style={{ background:`rgba(${sc==='#ef4444'?'239,68,68':sc==='#f97316'?'249,115,22':'234,179,8'},0.15)`, color:sc, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>{sl}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aniversariantes do mes */}
      {aniversariantes.length > 0 && (
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <Gift size={16} color="#E87722"/>
            <div style={{ color:'#888', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>
              Aniversariantes do mes
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {aniversariantes.map((c, i) => {
              const hoje = new Date();
              const nasc = new Date(c.birthdate);
              const aniv = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
              const diff = Math.ceil((aniv - hoje) / 86400000);
              const isHoje   = diff === 0;
              const isSemana = diff > 0 && diff <= 7;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background: isHoje ? 'rgba(232,119,34,0.08)' : '#161616', borderRadius:10, border: isHoje ? '1px solid rgba(232,119,34,0.25)' : '1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:20 }}>{isHoje ? '🎂' : '🎁'}</span>
                    <div>
                      <div style={{ color:'#ddd', fontSize:13, fontWeight:600 }}>{c.name}</div>
                      <div style={{ color:'#555', fontSize:11, marginTop:2 }}>
                        {nasc.getDate()}/{nasc.getMonth()+1} · {hoje.getFullYear() - nasc.getFullYear()} anos
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {isHoje && <span style={{ background:'rgba(232,119,34,.15)', color:'#E87722', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20 }}>Hoje!</span>}
                    {isSemana && !isHoje && <span style={{ background:'rgba(59,130,246,.1)', color:'#3B82F6', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20 }}>Em {diff}d</span>}
                    {c.phone && (
                      <button onClick={() => window.open(`https://wa.me/55${c.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Feliz aniversario, ${c.name.split(' ')[0]}! Que seu dia seja muito especial! 🎂🎉`)}`, '_blank')}
                        style={{ width:28, height:28, borderRadius:7, background:'rgba(37,211,102,.1)', border:'1px solid rgba(37,211,102,.2)', color:'#25D366', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>
                        💬
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Histórico de pagamentos recentes */}
      {extraStats?.pagamentosRecentes?.length > 0 && (
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:20 }}>
          <div style={{ color:'#888', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:16 }}>
            Últimos Pagamentos Recebidos
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {extraStats.pagamentosRecentes.map((p, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#161616', borderRadius:10, border:'1px solid rgba(255,255,255,.04)' }}>
                <div>
                  <div style={{ color:'#ddd', fontSize:13, fontWeight:600 }}>{p.clientName}</div>
                  <div style={{ color:'#555', fontSize:11, marginTop:2 }}>{p.eventType} · Parcela {p.number}/{p.total} · {new Date(p.paidAt).toLocaleDateString('pt-BR')}</div>
                </div>
                <div style={{ color:'#22C55E', fontSize:15, fontWeight:800 }}>+R${p.value.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
