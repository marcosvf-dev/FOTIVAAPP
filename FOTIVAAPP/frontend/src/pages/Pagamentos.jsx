import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { toast } from 'sonner';
import { CheckCircle, Circle, AlertCircle, Clock, RefreshCw, BarChart2, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';

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
  atrasado:      { label:'Atrasado',   color:'#EF4444', bg:'rgba(239,68,68,.1)',   icon:AlertCircle },
  vence_hoje:    { label:'Vence hoje', color:'#F59E0B', bg:'rgba(245,158,11,.1)',  icon:Clock },
  vence_em_breve:{ label:'Em breve',   color:OR,        bg:'rgba(232,119,34,.1)',  icon:Clock },
  pendente:      { label:'Pendente',   color:'#555',    bg:'rgba(255,255,255,.04)',icon:Circle },
};

const CATEGORIAS_DESPESA = [
  'Equipamento','Assistente','Transporte','Alimentação',
  'Marketing','Software','Estúdio','Edição','Impressão','Outro'
];

function ModalDespesa({ onClose, onSaved }) {
  const [form, setForm] = useState({
    description:'', amount:'', category:'Outro',
    date: new Date().toISOString().split('T')[0], eventId:'', notes:''
  });
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/events').then(r => setEventos(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const salvar = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) { toast.error('Descrição e valor são obrigatórios'); return; }
    setLoading(true);
    try {
      await api.post('/api/expenses', { ...form, amount: parseFloat(form.amount) });
      toast.success('Despesa registrada!');
      onSaved();
      onClose();
    } catch { toast.error('Erro ao salvar despesa'); }
    setLoading(false);
  };

  const inpStyle = { width:'100%', background:'#161616', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, color:'#ddd', padding:'10px 14px', fontSize:14, outline:'none', fontFamily:'inherit' };
  const labelStyle = { display:'block', fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:28, width:'100%', maxWidth:480, maxHeight:'90vh', overflow:'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <h2 style={{ color:'#fff', fontSize:18, fontWeight:800, margin:0 }}>📤 Nova Despesa</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        <form onSubmit={salvar}>
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Descrição</label>
            <input style={inpStyle} type="text" placeholder="Ex: Aluguel de lente" value={form.description} onChange={e => set('description', e.target.value)}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={labelStyle}>Valor (R$)</label>
              <input style={inpStyle} type="number" min="0" step="0.01" placeholder="0,00" value={form.amount} onChange={e => set('amount', e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Data</label>
              <input style={inpStyle} type="date" value={form.date} onChange={e => set('date', e.target.value)}/>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Categoria</label>
            <select style={{ ...inpStyle, cursor:'pointer' }} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIAS_DESPESA.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Vincular a evento (opcional)</label>
            <select style={{ ...inpStyle, cursor:'pointer' }} value={form.eventId} onChange={e => set('eventId', e.target.value)}>
              <option value="">Sem vínculo com evento</option>
              {eventos.map(ev => <option key={ev._id} value={ev._id}>{ev.eventType} — {ev.clientName}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={labelStyle}>Observações</label>
            <textarea style={{ ...inpStyle, minHeight:70, resize:'vertical' }} placeholder="Detalhes adicionais..." value={form.notes} onChange={e => set('notes', e.target.value)}/>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={onClose}
              style={{ flex:1, padding:'11px', borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'#888', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              style={{ flex:2, padding:'11px', borderRadius:10, background:'linear-gradient(135deg,#EF4444,#B91C1C)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:loading?.6:1 }}>
              {loading ? 'Salvando...' : '💾 Salvar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Pagamentos() {
  const [all,          setAll]          = useState([]);
  const [despesas,     setDespesas]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filtro,       setFiltro]       = useState('mes');
  const [aba,          setAba]          = useState('receitas');
  const [payingId,     setPayingId]     = useState(null);
  const [verGrafico,   setVerGrafico]   = useState(false);
  const [modalDespesa, setModalDespesa] = useState(false);
  const [stats,        setStats]        = useState({ total:0, atrasado:0, hoje:0, semana:0, mes:0, totalPendente:0 });
  const [statsDespesa, setStatsDespesa] = useState({ totalMes:0, totalGeral:0 });
  const [grafico,      setGrafico]      = useState([]);

  const load = useCallback(async () => {
    try {
      const [parcRes, despRes] = await Promise.all([
        api.get('/api/installments/pending'),
        api.get('/api/expenses').catch(() => ({ data: [] })),
      ]);

      const data = parcRes.data;
      const desp = despRes.data;
      setAll(data);
      setDespesas(desp);

      const hoje   = new Date(); hoje.setHours(0,0,0,0);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0);

      setStats({
        total:         data.length,
        atrasado:      data.filter(i => i.diffDays < 0).length,
        hoje:          data.filter(i => i.diffDays === 0).length,
        semana:        data.filter(i => i.diffDays >= 0 && i.diffDays <= 7).length,
        mes:           data.filter(i => { const d=new Date(i.dueDate); return d>=hoje && d<=fimMes; }).length,
        totalPendente: data.reduce((s,i) => s + i.value, 0),
      });

      const despMes = desp.filter(d => {
        const dd = new Date(d.date);
        return dd.getMonth() === hoje.getMonth() && dd.getFullYear() === hoje.getFullYear();
      });
      setStatsDespesa({
        totalMes:   despMes.reduce((s,d) => s + d.amount, 0),
        totalGeral: desp.reduce((s,d) => s + d.amount, 0),
      });

      const byMonth = {};
      data.forEach(i => {
        const d   = new Date(i.dueDate);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const lbl = d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
        if (!byMonth[key]) byMonth[key] = { label:lbl, receita:0, despesa:0 };
        byMonth[key].receita += i.value;
      });
      desp.forEach(d => {
        const dd  = new Date(d.date);
        const key = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}`;
        const lbl = dd.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
        if (!byMonth[key]) byMonth[key] = { label:lbl, receita:0, despesa:0 };
        byMonth[key].despesa += d.amount;
      });
      setGrafico(Object.entries(byMonth).sort(([a],[b])=>a.localeCompare(b)).slice(0,6).map(([,v])=>v));
    } catch { toast.error('Erro ao carregar pagamentos'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = all.filter(i => {
    const hoje   = new Date(); hoje.setHours(0,0,0,0);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0);
    const d      = new Date(i.dueDate);
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

  const deletarDespesa = async (id) => {
    if (!window.confirm('Excluir esta despesa?')) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      toast.success('Despesa removida');
      load();
    } catch { toast.error('Erro ao remover'); }
  };

  const maxGraf  = Math.max(...grafico.map(g => Math.max(g.receita, g.despesa)), 1);
  const hoje     = new Date();
  const receitaMes = all.filter(i => {
    const d = new Date(i.dueDate);
    return d.getMonth()===hoje.getMonth() && d.getFullYear()===hoje.getFullYear();
  }).reduce((s,i) => s + i.value, 0);
  const lucroMes = receitaMes - statsDespesa.totalMes;

  const tabStyle = (id) => ({
    flex:1, padding:'9px 12px', borderRadius:8, fontSize:13, fontWeight:600, border:'none', cursor:'pointer',
    background: aba===id ? 'linear-gradient(135deg,#E87722,#C85A00)' : 'transparent',
    color: aba===id ? '#fff' : '#555', fontFamily:'inherit', transition:'all .15s',
  });

  return (
    <Layout>
      <div style={{ maxWidth:860, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div>
            <h1 style={{ color:'#fff', fontSize:20, fontWeight:800, margin:0 }}>Pagamentos</h1>
            <p style={{ color:'#555', fontSize:13, marginTop:3 }}>Receitas, despesas e controle financeiro</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setModalDespesa(true)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, background:'linear-gradient(135deg,#EF4444,#B91C1C)', color:'#fff', border:'none', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>
              <Plus size={13}/> Despesa
            </button>
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

        {/* Stats */}
        <div style={{ display:'flex', gap:10, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
          {[
            { label:'A receber',    value:fmtMoney(stats.totalPendente),    color:OR,        filtro:'todos' },
            { label:'Atrasadas',    value:stats.atrasado,                   color:'#EF4444', filtro:'atraso' },
            { label:'Vence hoje',   value:stats.hoje,                       color:'#F59E0B', filtro:'hoje' },
            { label:'Este mês',     value:stats.mes,                        color:'#22C55E', filtro:'mes' },
            { label:'Despesas/mês', value:fmtMoney(statsDespesa.totalMes),  color:'#EF4444', filtro:null },
            { label:'Lucro/mês',    value:fmtMoney(lucroMes),               color: lucroMes >= 0 ? '#22C55E' : '#EF4444', filtro:null },
          ].map(s => (
            <button key={s.label} onClick={() => s.filtro && setFiltro(s.filtro)}
              style={{ background: s.filtro && filtro===s.filtro ? `${s.color}18` : '#0f0f14', border:`1px solid ${s.filtro && filtro===s.filtro ? s.color+'44' : 'rgba(255,255,255,.07)'}`, borderRadius:12, padding:'12px 14px', textAlign:'center', cursor: s.filtro ? 'pointer' : 'default', flexShrink:0, minWidth:100, fontFamily:'inherit', transition:'all .2s' }}>
              <div style={{ fontSize:15, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ color:'#555', fontSize:10, marginTop:4, fontWeight:600 }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Gráfico */}
        {verGrafico && grafico.length > 0 && (
          <div style={{ background:'#0f0f14', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'20px 16px', marginBottom:16 }}>
            <div style={{ fontSize:12, color:'#666', fontWeight:700, marginBottom:12, display:'flex', gap:16 }}>
              <span style={{ color:OR }}>■ Receitas</span>
              <span style={{ color:'#EF4444' }}>■ Despesas</span>
            </div>
            <div style={{ display:'flex', gap:8, height:120, alignItems:'flex-end', marginBottom:8 }}>
              {grafico.map((g, i) => (
                <div key={i} style={{ flex:1, display:'flex', gap:2, alignItems:'flex-end', justifyContent:'center' }}>
                  <div style={{ flex:1, background:`linear-gradient(180deg,${OR},#C85A00)`, borderRadius:'3px 3px 0 0', height:`${Math.max(4,(g.receita/maxGraf)*100)}px`, transition:'height .5s' }}/>
                  <div style={{ flex:1, background:'linear-gradient(180deg,#EF4444,#B91C1C)', borderRadius:'3px 3px 0 0', height:`${Math.max(4,(g.despesa/maxGraf)*100)}px`, transition:'height .5s' }}/>
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

        {/* Abas */}
        <div style={{ display:'flex', background:'#0d0d0d', border:'1px solid rgba(255,255,255,.06)', borderRadius:10, padding:4, marginBottom:16, gap:4 }}>
          <button style={tabStyle('receitas')} onClick={() => setAba('receitas')}>📥 Receitas</button>
          <button style={tabStyle('despesas')} onClick={() => setAba('despesas')}>📤 Despesas</button>
          <button style={tabStyle('resumo')}   onClick={() => setAba('resumo')}>📊 Resumo</button>
        </div>

        {/* ABA RECEITAS */}
        {aba === 'receitas' && (
          <>
            <div style={{ display:'flex', gap:6, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
              {FILTROS.map(f => (
                <button key={f.id} onClick={() => setFiltro(f.id)}
                  style={{ padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0,
                    background: filtro===f.id ? `linear-gradient(135deg,${OR},#C85A00)` : 'rgba(255,255,255,.06)',
                    color: filtro===f.id ? '#fff' : '#666' }}>
                  {f.label}
                  {f.id==='atraso' && stats.atrasado > 0 && <span style={{ marginLeft:5, background:'#EF4444', color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:10 }}>{stats.atrasado}</span>}
                  {f.id==='hoje'   && stats.hoje > 0    && <span style={{ marginLeft:5, background:'#F59E0B', color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:10 }}>{stats.hoje}</span>}
                </button>
              ))}
            </div>
            {loading ? (
              <div style={{ textAlign:'center', padding:'48px', color:'#555' }}>Carregando...</div>
            ) : !filtered.length ? (
              <div style={{ background:'#0f0f14', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'40px 24px', textAlign:'center' }}>
                <CheckCircle size={36} color="#22C55E" style={{ marginBottom:12 }}/>
                <div style={{ color:'#22C55E', fontSize:15, fontWeight:700, marginBottom:6 }}>
                  {filtro==='atraso' ? 'Nenhum pagamento atrasado! 🎉' : filtro==='hoje' ? 'Nenhum vencimento hoje!' : filtro==='mes' ? 'Nenhum vencimento este mês!' : 'Nenhuma parcela pendente! 🎉'}
                </div>
                <div style={{ color:'#555', fontSize:13 }}>Tudo em dia por aqui</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {filtered.map(item => {
                  const cfg  = STATUS_CFG[item.status] || STATUS_CFG.pendente;
                  const Icon = cfg.icon;
                  const paying = payingId === item.installmentId;
                  return (
                    <div key={item.installmentId}
                      style={{ background:'#0f0f14', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, borderLeft:`3px solid ${cfg.color}`, padding:'14px 16px', opacity:paying?.6:1 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                        <div>
                          <div style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{item.clientName}</div>
                          <div style={{ color:'#666', fontSize:12, marginTop:2 }}>{item.eventType}</div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{fmtMoney(item.value)}</div>
                          <div style={{ color:cfg.color, fontSize:11, fontWeight:700 }}>parcela {item.number}/{item.total}</div>
                        </div>
                      </div>
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
          </>
        )}

        {/* ABA DESPESAS */}
        {aba === 'despesas' && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ color:'#888', fontSize:13 }}>{despesas.length} despesa{despesas.length !== 1 ? 's' : ''} registrada{despesas.length !== 1 ? 's' : ''}</div>
              <button onClick={() => setModalDespesa(true)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, background:'linear-gradient(135deg,#EF4444,#B91C1C)', color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                <Plus size={13}/> Nova despesa
              </button>
            </div>
            {!despesas.length ? (
              <div style={{ background:'#0f0f14', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'40px 24px', textAlign:'center' }}>
                <TrendingDown size={36} color="#555" style={{ marginBottom:12 }}/>
                <div style={{ color:'#555', fontSize:14 }}>Nenhuma despesa registrada</div>
                <button onClick={() => setModalDespesa(true)}
                  style={{ marginTop:14, padding:'9px 20px', borderRadius:9, background:'linear-gradient(135deg,#EF4444,#B91C1C)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  + Registrar primeira despesa
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {despesas.map(d => (
                  <div key={d._id} style={{ background:'#0f0f14', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, borderLeft:'3px solid #EF4444', padding:'14px 16px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{d.description}</span>
                          <span style={{ background:'rgba(239,68,68,.1)', color:'#EF4444', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:12 }}>{d.category}</span>
                        </div>
                        <div style={{ color:'#555', fontSize:12 }}>
                          {fmtDate(d.date)}{d.eventName ? ` · ${d.eventName}` : ''}
                        </div>
                        {d.notes && <div style={{ color:'#444', fontSize:11, marginTop:4 }}>{d.notes}</div>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                        <div style={{ fontSize:18, fontWeight:800, color:'#EF4444' }}>- {fmtMoney(d.amount)}</div>
                        <button onClick={() => deletarDespesa(d._id)}
                          style={{ padding:7, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:8, color:'#ef4444', cursor:'pointer', display:'flex' }}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ABA RESUMO */}
        {aba === 'resumo' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              {[
                { label:'Receitas pendentes (total)', value:fmtMoney(stats.totalPendente),      color:OR,        icon:'📥' },
                { label:'Despesas registradas (total)', value:fmtMoney(statsDespesa.totalGeral), color:'#EF4444', icon:'📤' },
                { label:'Receitas este mês',            value:fmtMoney(receitaMes),              color:'#22C55E', icon:'📅' },
                { label:'Despesas este mês',            value:fmtMoney(statsDespesa.totalMes),   color:'#EF4444', icon:'📅' },
              ].map(item => (
                <div key={item.label} style={{ background:'#0f0f14', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'18px 16px' }}>
                  <div style={{ fontSize:20, marginBottom:6 }}>{item.icon}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:item.color }}>{item.value}</div>
                  <div style={{ color:'#555', fontSize:11, marginTop:4 }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: lucroMes >= 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border:`1px solid ${lucroMes >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius:14, padding:'20px 24px', marginBottom:16, display:'flex', alignItems:'center', gap:16 }}>
              {lucroMes >= 0 ? <TrendingUp size={32} color="#22C55E"/> : <TrendingDown size={32} color="#EF4444"/>}
              <div>
                <div style={{ color:'#888', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>Lucro estimado este mês</div>
                <div style={{ fontSize:28, fontWeight:900, color: lucroMes >= 0 ? '#22C55E' : '#EF4444', marginTop:4 }}>
                  {lucroMes >= 0 ? '+' : ''}{fmtMoney(lucroMes)}
                </div>
                <div style={{ color:'#555', fontSize:12, marginTop:4 }}>
                  {fmtMoney(receitaMes)} receitas − {fmtMoney(statsDespesa.totalMes)} despesas
                </div>
              </div>
            </div>

            {despesas.length > 0 && (
              <div style={{ background:'#0f0f14', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'20px 16px' }}>
                <div style={{ color:'#888', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:14 }}>Despesas por categoria</div>
                {Object.entries(
                  despesas.reduce((acc, d) => { acc[d.category] = (acc[d.category]||0) + d.amount; return acc; }, {})
                ).sort(([,a],[,b]) => b-a).map(([cat, total]) => {
                  const pct = Math.round((total / statsDespesa.totalGeral) * 100);
                  return (
                    <div key={cat} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ color:'#ccc', fontSize:13 }}>{cat}</span>
                        <span style={{ color:'#EF4444', fontSize:13, fontWeight:700 }}>{fmtMoney(total)} <span style={{ color:'#555', fontWeight:400 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height:4, background:'rgba(255,255,255,.06)', borderRadius:2 }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#EF4444,#B91C1C)', borderRadius:2, transition:'width .5s' }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      {modalDespesa && <ModalDespesa onClose={() => setModalDespesa(false)} onSaved={load}/>}
    </Layout>
  );
}
