import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Layout from '../components/Layout';
import api from '../lib/api';
import { toast } from 'sonner';
import { Camera, Plus, Trash2, Edit2, Save, X, DollarSign } from 'lucide-react';

const OR = '#E87722';

const CATEGORIAS = [
  { id:'camera',     label:'Camera',      icon:'📷' },
  { id:'lente',      label:'Lente',       icon:'🔍' },
  { id:'iluminacao', label:'Iluminacao',  icon:'💡' },
  { id:'audio',      label:'Audio',       icon:'🎤' },
  { id:'acessorio',  label:'Acessorio',   icon:'🎒' },
  { id:'outro',      label:'Outro',       icon:'📦' },
];

const cardStyle = { background:'#111', border:'1px solid rgba(255,255,255,.06)', borderRadius:14, padding:18, marginBottom:12 };
const inpStyle  = { width:'100%', background:'#161616', border:'1px solid rgba(255,255,255,.07)', borderRadius:9, color:'#fff', padding:'9px 12px', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' };
const labelStyle= { color:'#888', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:6 };

export default function Equipamentos() {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState({ name:'', buyValue:'', usageMonths:'', category:'camera', notes:'' });
  const [settings, setSettings] = useState({ monthlyEvents:4 });

  useEffect(() => {
    Promise.all([
      api.get('/api/equipments').catch(() => ({ data: [] })),
      api.get('/api/settings/calculator').catch(() => ({ data: { monthlyEvents:4 } })),
    ]).then(([r1, r2]) => {
      setItems(r1.data);
      setSettings(r2.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (modal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [modal]);

  const openNew = () => {
    setEditId(null);
    setForm({ name:'', buyValue:'', usageMonths:'', category:'camera', notes:'' });
    setModal(true);
  };

  const openEdit = (item) => {
    setEditId(item._id);
    setForm({ name:item.name, buyValue:item.buyValue, usageMonths:item.usageMonths, category:item.category||'camera', notes:item.notes||'' });
    setModal(true);
  };

  const save = async () => {
    if (!form.name || !form.buyValue || !form.usageMonths) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }
    try {
      if (editId) {
        await api.put(`/api/equipments/${editId}`, form);
        toast.success('Equipamento atualizado!');
      } else {
        await api.post('/api/equipments', form);
        toast.success('Equipamento cadastrado!');
      }
      setModal(false);
      const r = await api.get('/api/equipments');
      setItems(r.data);
    } catch(e) { toast.error(e.response?.data?.error || 'Erro ao salvar'); }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Remover "${name}"?`)) return;
    try {
      await api.delete(`/api/equipments/${id}`);
      toast.success('Equipamento removido');
      setItems(items.filter(i => i._id !== id));
    } catch(e) { toast.error('Erro ao remover'); }
  };

  const fmt = (v) => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

  const calcPorUso = (item) => {
    const custoMensal = item.buyValue / item.usageMonths;
    return custoMensal / (settings.monthlyEvents || 4);
  };

  const totalInvestido = items.reduce((sum, i) => sum + i.buyValue, 0);
  const totalPorEvento = items.reduce((sum, i) => sum + calcPorUso(i), 0);

  const Modal = () => createPortal(
    <div
      onClick={() => setModal(false)}
      style={{
        position:'fixed',
        top:0, left:0, right:0, bottom:0,
        background:'rgba(0,0,0,.88)',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        zIndex:99999,
        padding:'16px',
        overflowY:'auto',
        WebkitOverflowScrolling:'touch',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'#0d0d14',
          border:'1px solid rgba(255,255,255,.1)',
          borderRadius:18,
          padding:24,
          width:'100%',
          maxWidth:440,
          margin:'auto',
          boxSizing:'border-box',
          position:'relative',
        }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ color:'#fff', fontSize:17, fontWeight:800, margin:0 }}>{editId ? 'Editar equipamento' : 'Novo equipamento'}</h2>
          <button onClick={() => setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#555', padding:4, display:'flex' }}><X size={20}/></button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={labelStyle}>Nome do equipamento *</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} placeholder="Ex: Canon R5" style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Categoria</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
              {CATEGORIAS.map(c => (
                <button key={c.id} type="button" onClick={() => setForm(f => ({...f, category:c.id}))}
                  style={{ padding:'8px', borderRadius:8, border:`1px solid ${form.category===c.id ? OR+'66' : 'rgba(255,255,255,.07)'}`, background: form.category===c.id ? OR+'18' : 'transparent', color: form.category===c.id ? OR : '#666', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={labelStyle}>Valor de compra (R$) *</label>
              <input type="number" min="0" step="0.01" value={form.buyValue}
                onChange={e => setForm(f => ({...f, buyValue:e.target.value}))}
                placeholder="25000" style={inpStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Tempo de uso (meses) *</label>
              <input type="number" min="1" value={form.usageMonths}
                onChange={e => setForm(f => ({...f, usageMonths:e.target.value}))}
                placeholder="36" style={inpStyle}/>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Observacoes</label>
            <input value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))}
              placeholder="Opcional — ex: comprada em 2024" style={inpStyle}/>
          </div>

          {form.buyValue && form.usageMonths && (
            <div style={{ background:'rgba(232,119,34,.08)', border:'1px solid rgba(232,119,34,.2)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'#ccc' }}>
              <div style={{ color:OR, fontSize:11, fontWeight:700, marginBottom:4 }}>Calculo automatico:</div>
              <div>Custo mensal: <strong>{fmt(parseFloat(form.buyValue)/parseFloat(form.usageMonths))}</strong></div>
              <div>Custo por evento: <strong style={{ color:OR }}>{fmt(parseFloat(form.buyValue)/parseFloat(form.usageMonths)/(settings.monthlyEvents||4))}</strong></div>
              <div style={{ color:'#555', fontSize:10, marginTop:4 }}>Considerando {settings.monthlyEvents || 4} eventos por mes</div>
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={() => setModal(false)}
            style={{ flex:1, padding:'11px', borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'#888', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Cancelar
          </button>
          <button onClick={save}
            style={{ flex:2, padding:'11px', borderRadius:10, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            <Save size={14}/> {editId ? 'Atualizar' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <Layout>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, margin:0 }}>Meus Equipamentos</h1>
            <p style={{ color:'#555', fontSize:13, marginTop:4 }}>Cadastre seus equipamentos para calculo de precificacao</p>
          </div>
          <button onClick={openNew}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:10, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            <Plus size={15}/> Novo equipamento
          </button>
        </div>

        {items.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
            <div style={{ ...cardStyle, marginBottom:0, padding:16, textAlign:'center' }}>
              <div style={{ color:'#666', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>Investimento total</div>
              <div style={{ color:'#fff', fontSize:22, fontWeight:800, marginTop:6 }}>{fmt(totalInvestido)}</div>
            </div>
            <div style={{ ...cardStyle, marginBottom:0, padding:16, textAlign:'center' }}>
              <div style={{ color:'#666', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>Custo por evento</div>
              <div style={{ color:OR, fontSize:22, fontWeight:800, marginTop:6 }}>{fmt(totalPorEvento)}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ color:'#555', textAlign:'center', padding:40 }}>Carregando...</div>
        ) : !items.length ? (
          <div style={{ ...cardStyle, textAlign:'center', padding:50 }}>
            <Camera size={42} color="#333" style={{ marginBottom:14 }}/>
            <div style={{ color:'#666', fontSize:14, marginBottom:8 }}>Nenhum equipamento cadastrado</div>
            <div style={{ color:'#444', fontSize:12, marginBottom:20 }}>Cadastre seus equipamentos para o sistema calcular precos com base no seu investimento real</div>
            <button onClick={openNew}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 22px', borderRadius:10, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              <Plus size={15}/> Cadastrar primeiro equipamento
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {items.map(item => {
              const cat = CATEGORIAS.find(c => c.id === item.category) || CATEGORIAS[5];
              const porUso = calcPorUso(item);
              return (
                <div key={item._id} style={cardStyle}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                    <div style={{ fontSize:28 }}>{cat.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ color:'#fff', fontSize:15, fontWeight:700 }}>{item.name}</span>
                        <span style={{ background:'rgba(232,119,34,.1)', color:OR, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>{cat.label}</span>
                      </div>
                      <div style={{ display:'flex', gap:14, marginTop:8, flexWrap:'wrap' }}>
                        <span style={{ color:'#888', fontSize:12 }}>💰 Valor: <strong style={{ color:'#fff' }}>{fmt(item.buyValue)}</strong></span>
                        <span style={{ color:'#888', fontSize:12 }}>⏱ Uso: <strong style={{ color:'#fff' }}>{item.usageMonths} meses</strong></span>
                        <span style={{ color:OR, fontSize:12, fontWeight:600 }}>📸 Por evento: {fmt(porUso)}</span>
                      </div>
                      {item.notes && <div style={{ color:'#555', fontSize:11, marginTop:6 }}>{item.notes}</div>}
                    </div>
                    <div style={{ display:'flex', gap:5 }}>
                      <button onClick={() => openEdit(item)}
                        style={{ padding:7, background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)', borderRadius:7, color:'#3B82F6', cursor:'pointer', display:'flex' }}>
                        <Edit2 size={13}/>
                      </button>
                      <button onClick={() => remove(item._id, item.name)}
                        style={{ padding:7, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:7, color:'#ef4444', cursor:'pointer', display:'flex' }}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && <Modal/>}
    </Layout>
  );
}
