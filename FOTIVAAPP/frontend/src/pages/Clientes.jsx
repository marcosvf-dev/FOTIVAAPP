import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, User, Phone, Mail, Edit2, Trash2, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [editing,  setEditing]  = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '' });
  const [saving,   setSaving]   = useState(false);

  const fetch = async () => {
    try { const r = await api.get('/api/clients'); setClientes(r.data); }
    catch { toast.error('Erro ao carregar clientes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = clientes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const startEdit = (c) => { setEditing(c); setEditForm({ name: c.name, phone: c.phone || '', email: c.email || '' }); };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { toast.error('Nome obrigatório'); return; }
    setSaving(true);
    try {
      await api.put(`/api/clients/${editing._id}`, editForm);
      toast.success('Cliente atualizado!');
      setEditing(null);
      fetch();
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Excluir "${name}"?`)) return;
    try { await api.delete(`/api/clients/${id}`); toast.success('Cliente removido'); fetch(); }
    catch { toast.error('Erro ao remover'); }
  };

  const cardStyle = { background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px', transition: 'all .15s' };

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.4px' }}>Clientes</h1>
          <p style={{ color: '#555', fontSize: 13, marginTop: 4 }}>Gerencie sua carteira de clientes</p>
        </div>
        <button className="f-btn f-btn-primary" onClick={() => navigate('/clientes/novo', { state: { fromClientes: true } })} style={{ gap: 8 }}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[['Total', clientes.length, '#E87722'], ['Com Email', clientes.filter(c=>c.email).length, '#3B82F6'], ['Com Telefone', clientes.filter(c=>c.phone).length, '#22C55E']].map(([l,v,c]) => (
          <div key={l} style={cardStyle}>
            <div style={{ color: '#555', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</div>
            <div style={{ color: c, fontSize: 28, fontWeight: 800, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
        <input className="f-input" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, email ou telefone..." style={{ paddingLeft: 38 }} />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 76, background: '#111', borderRadius: 14, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : !filtered.length ? (
        <div style={{ textAlign: 'center', padding: '52px 0' }}>
          <User size={44} color="#222" style={{ margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: '#444', fontSize: 15 }}>{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}</p>
          {!search && <button className="f-btn f-btn-primary" onClick={() => navigate('/clientes/novo')} style={{ marginTop: 16 }}><Plus size={15} /> Adicionar cliente</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(c => (
            <div key={c._id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 14 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,119,34,0.2)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
              <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#E87722,#C85A00)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, color: '#fff', fontSize: 15 }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e0e0e0', fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                  {c.email && <span style={{ color: '#555', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{c.email}</span>}
                  {c.phone && <span style={{ color: '#555', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{c.phone}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => startEdit(c)} style={{ padding: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, color: '#3B82F6', cursor: 'pointer', display: 'flex' }}><Edit2 size={14} /></button>
                <button onClick={() => remove(c._id, c.name)} style={{ padding: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Editar Cliente</h2>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[['name','Nome','text'],['phone','Telefone','tel'],['email','Email','email']].map(([k,l,t]) => (
                <div key={k}>
                  <label className="f-label">{l}</label>
                  <input className="f-input" type={t} value={editForm[k]}
                    onChange={e => setEditForm(p => ({...p, [k]: e.target.value}))} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="f-btn f-btn-ghost" onClick={() => setEditing(null)} style={{ flex: 1 }}>Cancelar</button>
              <button className="f-btn f-btn-primary" onClick={saveEdit} disabled={saving} style={{ flex: 1 }}>
                {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Salvando...</> : <><Save size={15} /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
