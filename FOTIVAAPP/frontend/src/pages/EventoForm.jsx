import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const TIPOS = ['Casamento','Ensaio','Aniversário','Formatura','Corporativo','Book','Família','Gestante','Newborn','Outro'];
const PAGAMENTOS = [['pix','Pix'],['dinheiro','Dinheiro'],['transferencia','Transferência'],['credito','Crédito'],['debito','Débito']];
const STATUS = [['confirmado','Confirmado'],['pendente','Pendente'],['cancelado','Cancelado'],['concluido','Concluído']];

function EventoForm({ initialData, onSubmit, loading, title }) {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({
    clientId: '', clientName: '', eventType: '', eventDate: '', eventTime: '09:00',
    location: '', status: 'confirmado', totalValue: '', amountPaid: '0',
    installments: '1', paymentType: 'pix', notes: '', ...initialData
  });

  useEffect(() => {
    api.get('/api/clients').then(r => setClientes(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      eventDate: form.eventDate && form.eventTime ? `${form.eventDate}T${form.eventTime}:00` : form.eventDate || null,
      totalValue: parseFloat(form.totalValue) || 0,
      amountPaid: parseFloat(form.amountPaid) || 0,
      installments: parseInt(form.installments) || 1,
    };
    delete payload.eventTime;
    onSubmit(payload);
  };

  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 };
  const inputStyle = { width: '100%', background: '#161616', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#ddd', padding: '10px 14px', fontSize: 14, outline: 'none', transition: 'all .15s' };
  const sectionStyle = { background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22, marginBottom: 16 };

  const onFocus = e => { e.target.style.borderColor = '#E87722'; e.target.style.boxShadow = '0 0 0 3px rgba(232,119,34,0.15)'; };
  const onBlur  = e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none'; };

  const remaining = Math.max(0, (parseFloat(form.totalValue)||0) - (parseFloat(form.amountPaid)||0));

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button onClick={() => navigate(-1)} style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 9, color: '#888', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>{title}</h1>
            <p style={{ color: '#555', fontSize: 13, marginTop: 3 }}>Preencha os dados do evento</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Cliente */}
          <div style={sectionStyle}>
            <h3 style={{ color: '#E87722', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>Cliente</h3>
            <div>
              <label style={labelStyle}>Selecionar cliente</label>
              <select value={form.clientId} onChange={e => {
                const c = clientes.find(x => x._id === e.target.value);
                set('clientId', e.target.value);
                set('clientName', c?.name || '');
              }} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                <option value="">Selecione um cliente...</option>
                {clientes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            {!form.clientId && (
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Ou digite o nome do cliente</label>
                <input style={inputStyle} type="text" placeholder="Nome do cliente" value={form.clientName}
                  onChange={e => set('clientName', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
                <p style={{ color: '#444', fontSize: 11, marginTop: 5 }}>Se não existir, será criado automaticamente</p>
              </div>
            )}
          </div>

          {/* Evento */}
          <div style={sectionStyle}>
            <h3 style={{ color: '#E87722', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>Detalhes do Evento</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Tipo de evento</label>
                <select value={form.eventType} onChange={e => set('eventType', e.target.value)} required style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">Selecione o tipo...</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Data</label>
                <input style={inputStyle} type="date" value={form.eventDate} onChange={e => set('eventDate', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={labelStyle}>Horário</label>
                <input style={inputStyle} type="time" value={form.eventTime} onChange={e => set('eventTime', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Local</label>
                <input style={inputStyle} type="text" placeholder="Local do evento" value={form.location} onChange={e => set('location', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
                {form.location && form.location.trim().length > 3 && (
                  <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, color:'#555', alignSelf:'center' }}>Abrir em:</span>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.location)}`} target="_blank" rel="noreferrer"
                      style={{ fontSize:11, fontWeight:700, padding:'5px 12px', borderRadius:8, background:'rgba(66,133,244,.12)', color:'#4285F4', border:'1px solid rgba(66,133,244,.25)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
                      🗺 Google Maps
                    </a>
                    <a href={`https://waze.com/ul?q=${encodeURIComponent(form.location)}&navigate=yes`} target="_blank" rel="noreferrer"
                      style={{ fontSize:11, fontWeight:700, padding:'5px 12px', borderRadius:8, background:'rgba(0,162,197,.12)', color:'#00A2C5', border:'1px solid rgba(0,162,197,.25)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
                      🚗 Waze
                    </a>
                    <a href={`https://maps.apple.com/?q=${encodeURIComponent(form.location)}`} target="_blank" rel="noreferrer"
                      style={{ fontSize:11, fontWeight:700, padding:'5px 12px', borderRadius:8, background:'rgba(255,255,255,.06)', color:'#aaa', border:'1px solid rgba(255,255,255,.1)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
                      🍎 Apple Maps
                    </a>
                  </div>
                )}
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Status</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STATUS.map(([v,l]) => (
                    <button key={v} type="button" onClick={() => set('status', v)}
                      style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all .15s',
                        background: form.status === v ? 'linear-gradient(135deg,#E87722,#C85A00)' : '#1A1A1A',
                        color: form.status === v ? '#fff' : '#666',
                      }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Financeiro */}
          <div style={sectionStyle}>
            <h3 style={{ color: '#E87722', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>Financeiro</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Valor total (R$)</label>
                <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0,00" value={form.totalValue} onChange={e => set('totalValue', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={labelStyle}>Valor pago (R$)</label>
                <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0,00" value={form.amountPaid} onChange={e => set('amountPaid', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={labelStyle}>Parcelas</label>
                <select value={form.installments} onChange={e => set('installments', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x{n > 1 ? ` (R$${(remaining/n).toFixed(2)})` : ` — sem parcelas`}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Forma de pagamento</label>
                <select value={form.paymentType} onChange={e => set('paymentType', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                  {PAGAMENTOS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            {(parseFloat(form.totalValue)||0) > 0 && (
              <div style={{ marginTop: 14, padding: '12px 16px', background: '#161616', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ color: '#555', fontSize: 13 }}>Saldo restante:</span>
                <span style={{ color: remaining > 0 ? '#E87722' : '#22C55E', fontWeight: 700, fontSize: 15 }}>R${remaining.toFixed(2).replace('.',',')}</span>
              </div>
            )}
          </div>

          {/* Observações */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Observações</label>
            <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} placeholder="Detalhes adicionais..." value={form.notes} onChange={e => set('notes', e.target.value)} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="f-btn f-btn-ghost" onClick={() => navigate(-1)} style={{ flex: 1, padding: '12px' }}>Cancelar</button>
            <button type="submit" className="f-btn f-btn-primary" disabled={loading} style={{ flex: 2, padding: '12px' }}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Salvando...</> : <><Save size={16} /> Salvar Evento</>}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export function NovoEvento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const submit = async (data) => {
    if (!data.clientId && !data.clientName) { toast.error('Informe o cliente'); return; }
    if (!data.eventType) { toast.error('Tipo de evento obrigatório'); return; }
    setLoading(true);
    try {
      await api.post('/api/events', data);
      toast.success('Evento criado!');
      navigate('/eventos');
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao criar evento'); }
    finally { setLoading(false); }
  };

  return <EventoForm title="Novo Evento" onSubmit={submit} loading={loading} />;
}

export function EditarEvento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    api.get(`/api/events/${id}`).then(r => {
      const ev = r.data;
      const d = ev.eventDate ? new Date(ev.eventDate) : null;
      setInitial({
        ...ev,
        clientId: ev.clientId || '',
        eventDate: d ? d.toISOString().split('T')[0] : '',
        eventTime: d ? d.toTimeString().slice(0, 5) : '09:00',
        totalValue: ev.totalValue?.toString() || '',
        amountPaid: ev.amountPaid?.toString() || '0',
        installments: ev.installments?.toString() || '1',
      });
    }).catch(() => { toast.error('Evento não encontrado'); navigate('/eventos'); });
  }, [id]);

  const submit = async (data) => {
    setLoading(true);
    try {
      await api.put(`/api/events/${id}`, data);
      toast.success('Evento atualizado!');
      navigate('/eventos');
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao atualizar'); }
    finally { setLoading(false); }
  };

  if (!initial) return (
    <Layout><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div></Layout>
  );

  return <EventoForm title="Editar Evento" initialData={initial} onSubmit={submit} loading={loading} />;
}

export default NovoEvento;
