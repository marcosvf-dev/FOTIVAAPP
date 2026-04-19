import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { DollarSign, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const TYPE_LABEL = { pix:'Pix', dinheiro:'Dinheiro', transferencia:'Transferência', credito:'Crédito', debito:'Débito' };

export default function Pagamentos() {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('todos');

  const fetch = async () => {
    try { const r = await api.get('/api/payments'); setPayments(r.data); }
    catch { toast.error('Erro ao carregar pagamentos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const filtered = filter === 'todos' ? payments : payments.filter(p => p.status === filter);

  const total     = payments.reduce((s, p) => s + (p.totalValue || 0), 0);
  const recebido  = payments.reduce((s, p) => s + (p.amountPaid || 0), 0);
  const pendente  = payments.reduce((s, p) => s + (p.remaining || 0), 0);

  const fmt = v => `R$${(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
  const STATUS_COLOR = { pago: '#22C55E', parcial: '#E87722', pendente: '#ef4444' };
  const filters = [['todos','Todos'],['pago','Pagos'],['parcial','Parciais'],['pendente','Pendentes']];
  const cardBase = { background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 20 };

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.4px' }}>Pagamentos</h1>
        <p style={{ color: '#555', fontSize: 13, marginTop: 4 }}>Controle financeiro dos seus eventos</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Total contratado', value: fmt(total),    icon: TrendingUp, color: '#3B82F6', rgb: '59,130,246' },
          { label: 'Recebido',         value: fmt(recebido), icon: CheckCircle, color: '#22C55E', rgb: '34,197,94' },
          { label: 'A receber',        value: fmt(pendente), icon: Clock,       color: '#E87722', rgb: '232,119,34' },
        ].map(({ label, value, icon: Icon, color, rgb }) => (
          <div key={label} style={{ ...cardBase, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', background: `rgba(${rgb},0.07)` }} />
            <div style={{ width: 38, height: 38, background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.2)`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Icon size={18} color={color} />
            </div>
            <div style={{ color: '#555', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ color: color, fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all .15s',
              background: filter === v ? 'linear-gradient(135deg,#E87722,#C85A00)' : '#1A1A1A',
              color: filter === v ? '#fff' : '#666',
            }}>{l}</button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 90, background: '#111', borderRadius: 14, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : !filtered.length ? (
        <div style={{ textAlign: 'center', padding: '52px 0' }}>
          <DollarSign size={44} color="#222" style={{ margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: '#444', fontSize: 15 }}>Nenhum pagamento encontrado</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(p => {
            const sc = STATUS_COLOR[p.status] || '#888';
            const pct = p.totalValue > 0 ? Math.round((p.amountPaid / p.totalValue) * 100) : 0;
            return (
              <div key={p.id} style={cardBase}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: '#e0e0e0', fontWeight: 700, fontSize: 14 }}>{p.eventType}</span>
                      <span style={{ background: `${sc}22`, color: sc, border: `1px solid ${sc}44`, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{p.status}</span>
                      {p.paymentType && <span style={{ background: 'rgba(255,255,255,0.05)', color: '#666', fontSize: 10, padding: '2px 7px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>{TYPE_LABEL[p.paymentType]}</span>}
                    </div>
                    <div style={{ color: '#666', fontSize: 13 }}>{p.clientName}</div>
                    {p.installments > 1 && <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>{p.installments}x parcelas</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{fmt(p.totalValue)}</div>
                    {p.remaining > 0 && <div style={{ color: '#E87722', fontSize: 12, fontWeight: 600, marginTop: 2 }}>Falta {fmt(p.remaining)}</div>}
                    {p.status === 'pago' && <div style={{ color: '#22C55E', fontSize: 12, fontWeight: 600, marginTop: 2 }}>Pago ✓</div>}
                  </div>
                </div>
                {p.totalValue > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ color: '#555', fontSize: 11 }}>{fmt(p.amountPaid)} recebidos</span>
                      <span style={{ color: '#555', fontSize: 11 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#22C55E' : 'linear-gradient(90deg,#E87722,#C85A00)', borderRadius: 10, transition: 'width .4s ease' }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
