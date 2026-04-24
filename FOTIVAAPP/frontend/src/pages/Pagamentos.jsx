import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { toast } from 'sonner';
import { CheckCircle, Circle, AlertCircle, Clock, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const OR = '#E87722';
const card = (extra={}) => ({ background:'#0f0f14', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, ...extra });

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function fmtMoney(v) {
  return 'R$' + (v||0).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

const STATUS_CFG = {
  atrasado:      { label:'Atrasado',      color:'#EF4444', bg:'rgba(239,68,68,.1)',   icon:AlertCircle },
  vence_hoje:    { label:'Vence hoje',    color:'#F59E0B', bg:'rgba(245,158,11,.1)',  icon:Clock },
  vence_em_breve:{ label:'Vence em breve',color:OR,        bg:'rgba(232,119,34,.1)',  icon:Clock },
  pendente:      { label:'Pendente',      color:'#666',    bg:'rgba(255,255,255,.04)',icon:Circle },
};

export default function Pagamentos() {
  const [pending,   setPending]   = useState([]);
  const [paid,      setPaid]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [payingId,  setPayingId]  = useState(null);
  const [showPaid,  setShowPaid]  = useState(false);
  const [stats,     setStats]     = useState({ total:0, atrasado:0, hoje:0, semana:0, totalPendente:0 });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/installments/pending');
      const urgente = data.filter(i => i.diffDays <= 7);
      const normal  = data.filter(i => i.diffDays > 7);
      setPending([...urgente, ...normal]);

      const totalPendente = data.reduce((s,i) => s + i.value, 0);
      setStats({
        total:         data.length,
        atrasado:      data.filter(i => i.diffDays < 0).length,
        hoje:          data.filter(i => i.diffDays === 0).length,
        semana:        data.filter(i => i.diffDays >= 0 && i.diffDays <= 7).length,
        totalPendente,
      });
    } catch { toast.error('Erro ao carregar pagamentos'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markPaid(item) {
    setPayingId(item.installmentId);
    try {
      await api.post(`/api/installments/${item.eventId}/pay/${item.installmentId}`);
      toast.success(`✅ Parcela ${item.number}/${item.total} de ${item.clientName} marcada como paga!`);
      // Move to paid list
      setPaid(p => [{ ...item, paidNow: true }, ...p]);
      setPending(p => p.filter(i => i.installmentId !== item.installmentId));
      setStats(s => ({
        ...s,
        total: s.total - 1,
        atrasado: item.diffDays < 0 ? s.atrasado - 1 : s.atrasado,
        hoje:     item.diffDays === 0 ? s.hoje - 1 : s.hoje,
        semana:   item.diffDays <= 7 ? s.semana - 1 : s.semana,
        totalPendente: s.totalPendente - item.value,
      }));
    } catch { toast.error('Erro ao marcar pagamento'); }
    setPayingId(null);
  }

  async function unmarkPaid(item) {
    try {
      await api.post(`/api/installments/${item.eventId}/unpay/${item.installmentId}`);
      toast.success('Pagamento desmarcado');
      setPaid(p => p.filter(i => i.installmentId !== item.installmentId));
      await load();
    } catch { toast.error('Erro ao desmarcar'); }
  }

  const InstCard = ({ item, isPaid }) => {
    const cfg = STATUS_CFG[item.status] || STATUS_CFG.pendente;
    const Icon = cfg.icon;
    const paying = payingId === item.installmentId;

    return (
      <div style={{ ...card({ padding:'16px 18px', marginBottom:10, transition:'all .2s', opacity: paying?.6:1 }),
        borderLeft: `3px solid ${isPaid ? '#22C55E' : cfg.color}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{item.clientName}</span>
              <span style={{ color:'#555', fontSize:12 }}>·</span>
              <span style={{ color:'#666', fontSize:12 }}>{item.eventType}</span>
            </div>
            <div style={{ color:'#888', fontSize:12, marginBottom:6 }}>
              Parcela <strong style={{ color:'#ccc' }}>{item.number}/{item.total}</strong>
              {' '}· Vencimento: <strong style={{ color: isPaid ? '#22C55E' : cfg.color }}>{fmtDate(item.dueDate)}</strong>
              {item.paidNow && <span style={{ marginLeft:8, color:'#22C55E', fontSize:11 }}>pago agora ✓</span>}
              {item.paidAt && !item.paidNow && <span style={{ marginLeft:8, color:'#22C55E', fontSize:11 }}>pago em {fmtDate(item.paidAt)}</span>}
            </div>
            {!isPaid && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, background:cfg.bg, color:cfg.color }}>
                <Icon size={10}/> {cfg.label}
                {item.diffDays < 0 && ` (${Math.abs(item.diffDays)} dia${Math.abs(item.diffDays)!==1?'s':''} atraso)`}
                {item.diffDays > 0 && ` (em ${item.diffDays} dia${item.diffDays!==1?'s':''})`}
              </span>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:18, fontWeight:800, color: isPaid ? '#22C55E' : '#fff' }}>{fmtMoney(item.value)}</div>
            </div>
            {!isPaid ? (
              <button onClick={() => markPaid(item)} disabled={paying}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, background:'linear-gradient(135deg,#22C55E,#16A34A)', color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                <CheckCircle size={14}/> {paying ? '...' : 'Marcar pago'}
              </button>
            ) : (
              <button onClick={() => unmarkPaid(item)}
                style={{ padding:'7px 12px', borderRadius:9, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#555', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Desfazer
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div style={{ maxWidth:860, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, margin:0 }}>Pagamentos</h1>
            <p style={{ color:'#555', fontSize:13, marginTop:4 }}>Controle de parcelas e recebimentos</p>
          </div>
          <button onClick={load} style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:9, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#888', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            <RefreshCw size={14}/> Atualizar
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'A receber', value: fmtMoney(stats.totalPendente), color:OR, sub:`${stats.total} parcela${stats.total!==1?'s':''}` },
            { label:'Atrasadas', value: stats.atrasado, color:'#EF4444', sub:'parcelas em atraso' },
            { label:'Vencem hoje', value: stats.hoje, color:'#F59E0B', sub:'para receber hoje' },
            { label:'Próx. 7 dias', value: stats.semana, color:'#22C55E', sub:'vencendo na semana' },
          ].map(s => (
            <div key={s.label} style={{ ...card({ padding:'16px', textAlign:'center' }) }}>
              <div style={{ fontSize:22, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ color:'#fff', fontSize:12, fontWeight:600, marginTop:4 }}>{s.label}</div>
              <div style={{ color:'#444', fontSize:10, marginTop:2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Parcelas pendentes */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'48px', color:'#555' }}>Carregando...</div>
        ) : !pending.length ? (
          <div style={{ ...card({ padding:'48px', textAlign:'center' }) }}>
            <CheckCircle size={40} color="#22C55E" style={{ marginBottom:14 }}/>
            <div style={{ color:'#22C55E', fontSize:16, fontWeight:700, marginBottom:6 }}>Tudo em dia! 🎉</div>
            <div style={{ color:'#555', fontSize:13 }}>Nenhuma parcela pendente no momento</div>
          </div>
        ) : (
          <>
            {/* Urgentes primeiro */}
            {pending.filter(i => i.diffDays <= 0).length > 0 && (
              <div style={{ marginBottom:8 }}>
                <div style={{ color:'#EF4444', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                  <AlertCircle size={12}/> Atrasadas / Vencem hoje
                </div>
                {pending.filter(i => i.diffDays <= 0).map(item => <InstCard key={item.installmentId} item={item} isPaid={false}/>)}
              </div>
            )}

            {pending.filter(i => i.diffDays > 0 && i.diffDays <= 7).length > 0 && (
              <div style={{ marginBottom:8 }}>
                <div style={{ color:OR, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                  <Clock size={12}/> Próximos 7 dias
                </div>
                {pending.filter(i => i.diffDays > 0 && i.diffDays <= 7).map(item => <InstCard key={item.installmentId} item={item} isPaid={false}/>)}
              </div>
            )}

            {pending.filter(i => i.diffDays > 7).length > 0 && (
              <div style={{ marginBottom:8 }}>
                <div style={{ color:'#555', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>
                  Próximas parcelas
                </div>
                {pending.filter(i => i.diffDays > 7).map(item => <InstCard key={item.installmentId} item={item} isPaid={false}/>)}
              </div>
            )}
          </>
        )}

        {/* Pagas recentemente */}
        {paid.length > 0 && (
          <div style={{ marginTop:24 }}>
            <button onClick={() => setShowPaid(p => !p)}
              style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', color:'#555', fontSize:13, cursor:'pointer', fontFamily:'inherit', marginBottom:10, padding:0 }}>
              {showPaid ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
              {paid.length} parcela{paid.length!==1?'s':''} paga{paid.length!==1?'s':''} nesta sessão
            </button>
            {showPaid && paid.map(item => <InstCard key={item.installmentId} item={item} isPaid={true}/>)}
          </div>
        )}

      </div>
    </Layout>
  );
}
