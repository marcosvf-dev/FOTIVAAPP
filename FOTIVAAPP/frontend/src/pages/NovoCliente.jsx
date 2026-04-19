import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export default function NovoCliente() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    setLoading(true);
    try {
      await api.post('/api/clients', form);
      toast.success('Cliente cadastrado!');
      navigate('/clientes');
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
    finally { setLoading(false); }
  };

  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 };
  const cardStyle  = { background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, marginBottom: 16 };

  return (
    <Layout>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button onClick={() => navigate('/clientes')} style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 9, color: '#888', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>Novo Cliente</h1>
            <p style={{ color: '#555', fontSize: 13, marginTop: 3 }}>Adicione um novo cliente à sua carteira</p>
          </div>
        </div>

        <form onSubmit={handle}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[['name','Nome completo *','text','Ex: Ana Carolina'],['phone','Telefone / WhatsApp','tel','(11) 99999-9999'],['email','Email','email','cliente@email.com']].map(([k,l,t,ph]) => (
                <div key={k}>
                  <label style={labelStyle}>{l}</label>
                  <input className="f-input" type={t} placeholder={ph} required={k === 'name'}
                    value={form[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Observações</label>
                <textarea className="f-input" placeholder="Preferências, detalhes importantes..." rows={3}
                  style={{ resize: 'vertical' }} value={form.notes}
                  onChange={e => setForm(p => ({...p, notes: e.target.value}))} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="f-btn f-btn-ghost" onClick={() => navigate('/clientes')} style={{ flex: 1, padding: '12px' }}>Cancelar</button>
            <button type="submit" className="f-btn f-btn-primary" disabled={loading} style={{ flex: 2, padding: '12px' }}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Salvando...</> : <><Save size={15} /> Salvar Cliente</>}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
