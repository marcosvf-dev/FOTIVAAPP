import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { toast } from 'sonner';
import { CheckCircle, Circle, AlertCircle, Clock, RefreshCw, TrendingUp, BarChart2 } from 'lucide-react';

const OR = '#E87722';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function fmtMoney(v) {
  return 'R$' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

const FILTROS = [
  { id:'mes',    label:'Este mês' },
  { id:'hoje',   label:'Vence hoje' },
  { id:'semana', label:'Próximos 7 dias' },
  { id:'atraso', label:'Atrasadas' },
  { id:'todos',  label:'Todos' },
];

const STATUS_CFG = {
  atrasado:      { label:'Atrasado',      color:'#EF4444', bg:'rgba(239,68,68,.1)',   icon:AlertCircle },
  vence_hoje:    { label:'Vence hoje',    color:'#F59E0B', bg:'rgba(245,158,11,.1)',  icon:Clock },
  vence_em_breve:{ label:'Em breve',      color:OR,        bg:'rgba(232,119,34,.1)',  icon:Clock },
  pendente:      { label:'Pendente',      color:'#555',    bg:'rgba(255,255,255,.04)',icon:Circle },
};

export default function Pagamentos() {
  const [all,       setAll]       = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filtro,    setFiltro]    = useState('mes');
  const [payingId,  setPayingId]  = useState(null);
  const [verGrafico,setVerGrafico]= useState(false);
  const [stats,     setStats]     = useState({ total:0, atrasado:0, hoje:0, semana:0, mes:0, totalPendente:0 });
  const [grafico,   setGrafico]   = useState([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/installments/pending');
      setAll(data);
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0);
      setStats({
        total:         data.length,
        atrasado:      data.filter(i => i.diffDays < 0).length,
        hoje:          data.filter(i => i.diffDays === 0).length,
        semana:        data.filter(i => i.diffDays >= 0 && i.diffDays <= 7).length,
        mes:           data.filter(i => { const d=new Date(i.dueDate); return d>=hoje && d<=fimMes; }).length,
        totalPendente: data.reduce((s,i) => s + i.value, 0),
      });
      // Gráfico: agrupa por mês
      const byMonth = {};
      data.forEach(i => {
        const d   = new Date(i.dueDate);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const lbl = d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
        if (!byMonth[key]) byMonth[key] = { label:lbl, total:0, count:0 };
        byMonth[key].total += i.value;
        byMonth[key].count++;
      });
      setGrafico(Object.entries(byMonth).sort(([a],[b])=>a.localeCompare(b)).slice(0,6).map(([,v])=>v));
    } catch { toast.error('Erro ao carregar pagamentos'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = all.filter(i => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0);
    const d = new Date(i.dueDate);
    if (filtro === 'hoje')   return i.diffDays === 0;
    if (filtro === 'semana') return i.diffDays >= 0 && i.diffDays <= 7;
    if (filtro === 'atraso') return i.diffDays < 0;
    if (filtro === 'mes')    return d >= hoje && d <= fimMes;
    return true;
  });

  async function markPaid(item) {
    setPayingId(item.installmentId);
    try {
      await api.post(`/api/installments/${item.eventId}/pay/${item.installmentId}`);
      toast.success(`✅ Pago! Parcela ${item.number}/${item.total} de ${item.clientName}`);
      load();
    } catch { toast.error('Erro ao marcar pagamento'); }
    setPayingId(null);
  }

  async function unmarkPaid(eventId, installmentId) {
    try {
      await api.post(`/api/installments/${eventId}/unpay/${installmentId}`);
      toast.success('Pagamento desmarcado');
      load();
    } catch { toast.error('Erro ao desmarcar'); }
  }

  const maxGraf = Math.max(...grafico.map(g=>g.total), 1);

  return (
    <Layout>
      <div style={{ maxWidth:860, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div>
            <h1 style={{ color:'#fff', fontSize:20, fontWeight:800, margin:0 }}>Pagamentos</h1>
            <p style={{ color:'#555', fontSize:13, marginTop:3 }}>Controle de parcelas e recebimentos</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setVerGrafico(g=>!g)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, background: verGrafico ? `linear-gradient(135deg,${OR},#C85A00)` : 'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color: verGrafico ? '#fff' : '#888', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
              <BarChart2 size={14}/> Gráfico
            </button>
            <button onClick={load}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#888', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              <RefreshCw size={13}/>
            </button>
          </div>
        </div>

        {/* Stats cards — scroll horizontal no mobile */}
        <div style={{ display:'flex', gap:10, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
          {[
            { label:'A receber', value:fmtMoney(stats.totalPendente), color:OR, filtro:'todos' },
            { label:'Atrasadas', value:stats.atrasado, color:'#EF4444', filtro:'atraso' },
            { label:'Vence hoje', value:stats.hoje, color:'#F59E0B', filtro:'hoje' },
            { label:'Próx 7 dias', value:stats.semana, color:OR, filtro:'semana' },
            { label:'Este mês', value:stats.mes, color:'#22C55E', filtro:'mes' },
          ].map(s => (
            <button key={s.label} onClick={() => setFiltro(s.filtro)}
              style={{ background: filtro===s.filtro ? `${s.color}18` : '#0f0f14', border:`1px solid ${filtro===s.filtro ? s.color+'44' : 'rgba(255,255,255,.07)'}`, borderRadius:12, padding:'12px 14px', textAlign:'center', cursor:'pointer', flexShrink:0, minWidth:100, fontFamily:'inherit', transition:'all .2s' }}>
              <div style={{ fontSize:16, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ color:'#555', fontSize:10, marginTop:4, fontWeight:600 }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Gráfico */}
        {verGrafico && grafico.length > 0 && (
          <div style={{ background:'#0f0f14', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'20px 16px', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120, marginBottom:8 }}>
              {grafico.map((g, i) => (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ color:'#666', fontSize:9, fontWeight:600 }}>{fmtMoney(g.total).replace('R$','')}</div>
                  <div style={{ width:'100%', background:`linear-gradient(180deg,${OR},#C85A00)`, borderRadius:'4px 4px 0 0', height:`${Math.max(8,(g.total/maxGraf)*90)}px`, transition:'height .5s' }}/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {grafico.map((g, i) => (
                <div key={i} style={{ flex:1, textAlign:'center', color:'#444', fontSize:9, fontWeight:600 }}>{g.label}</div>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display:'flex', gap:6, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
          {FILTROS.map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              style={{ padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0, transition:'all .2s',
                background: filtro===f.id ? `linear-gradient(135deg,${OR},#C85A00)` : 'rgba(255,255,255,.06)',
                color: filtro===f.id ? '#fff' : '#666' }}>
              {f.label}
              {f.id==='atraso' && stats.atrasado > 0 && <span style={{ marginLeft:5, background:'#EF4444', color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:10 }}>{stats.atrasado}</span>}
              {f.id==='hoje' && stats.hoje > 0 && <span style={{ marginLeft:5, background:'#F59E0B', color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:10 }}>{stats.hoje}</span>}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'48px', color:'#555' }}>Carregando...</div>
        ) : !filtered.length ? (
          <div style={{ background:'#0f0f14', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'40px 24px', textAlign:'center' }}>
            <CheckCircle size={36} color="#22C55E" style={{ marginBottom:12 }}/>
            <div style={{ color:'#22C55E', fontSize:15, fontWeight:700, marginBottom:6 }}>
              {filtro==='atraso' ? 'Nenhum pagamento atrasado! 🎉' :
               filtro==='hoje'   ? 'Nenhum vencimento hoje!' :
               filtro==='mes'    ? 'Nenhum vencimento este mês!' :
               'Nenhuma parcela pendente! 🎉'}
            </div>
            <div style={{ color:'#555', fontSize:13 }}>Tudo em dia por aqui</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map(item => {
              const cfg = STATUS_CFG[item.status] || STATUS_CFG.pendente;
              const Icon = cfg.icon;
              const paying = payingId === item.installmentId;
              return (
                <div key={item.installmentId}
                  style={{ background:'#0f0f14', border:`1px solid rgba(255,255,255,.07)`, borderRadius:14, borderLeft:`3px solid ${cfg.color}`, padding:'14px 16px', opacity:paying?.6:1, transition:'all .2s' }}>

                  {/* Linha 1: nome + valor */}
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                    <div>
                      <div style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{item.clientName}</div>
                      <div style={{ color:'#666', fontSize:12, marginTop:2 }}>{item.eventType}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{fmtMoney(item.value)}</div>
                      <div style={{ color:cfg.color, fontSize:11, fontWeight:700 }}>
                        parcela {item.number}/{item.total}
                      </div>
                    </div>
                  </div>

                  {/* Linha 2: data + status */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:6, background:cfg.bg, color:cfg.color }}>
                        <Icon size={10}/>
                        {cfg.label}
                        {item.diffDays < 0 && ` (${Math.abs(item.diffDays)}d atraso)`}
                        {item.diffDays > 0 && ` (em ${item.diffDays}d)`}
                      </span>
                      <span style={{ color:'#444', fontSize:11 }}>vence {fmtDate(item.dueDate)}</span>
                    </div>
                    <button onClick={() => markPaid(item)} disabled={paying}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:9, background:'linear-gradient(135deg,#22C55E,#16A34A)', color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                      <CheckCircle size={13}/> {paying ? '...' : 'Marcar pago'}
                    </button>
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
