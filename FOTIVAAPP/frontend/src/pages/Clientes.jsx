import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, User, Phone, Mail, Edit2, Trash2, X, Save, MapPin, Hash, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const OR = '#E87722';
const inp = (extra={}) => ({ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'10px 13px', color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit', ...extra });
const lbl = { display:'block', fontSize:10, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:.5, marginBottom:5 };

function fmtCPF(v='') { return v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4'); }
function fmtPhone(v='') { return v.replace(/\D/g,'').slice(0,11).replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4,5})(\d{4})$/,'$1-$2'); }

const EMPTY_EDIT = { name:'', phone:'', email:'', cpf:'', address:'', city:'', state:'', complement:'', notes:'' };

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes,  setClientes]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [editing,   setEditing]   = useState(null);
  const [editForm,  setEditForm]  = useState(EMPTY_EDIT);
  const [saving,    setSaving]    = useState(false);
  const [expanded,  setExpanded]  = useState(null);

  const load = useCallback(async () => {
    try { const r = await api.get('/api/clients'); setClientes(r.data); }
    catch { toast.error('Erro ao carregar clientes'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = clientes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.cpf?.includes(search)
  );

  const startEdit = (c) => {
    setEditing(c);
    setEditForm({ name:c.name||'', phone:c.phone||'', email:c.email||'', cpf:c.cpf||'', address:c.address||'', city:c.city||'', state:c.state||'', complement:c.complement||'', notes:c.notes||'' });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { toast.error('Nome obrigatório'); return; }
    setSaving(true);
    try {
      await api.put(`/api/clients/${editing._id}`, editForm);
      toast.success('Cliente atualizado!');
      setEditing(null);
      load();
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Excluir "${name}"?`)) return;
    try { await api.delete(`/api/clients/${id}`); toast.success('Cliente removido'); load(); }
    catch { toast.error('Erro ao remover'); }
  };

  const sendWhats = (c) => {
    const phone = c.phone?.replace(/\D/g,'');
    if (!phone) { toast.error('Cliente sem telefone cadastrado'); return; }
    window.open(`https://wa.me/55${phone}`, '_blank');
  };

  const initials = (name='') => name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const colors   = ['#E87722','#3B82F6','#22C55E','#A855F7','#EC4899','#14B8A6'];
  const colorFor = (name='') => colors[name.charCodeAt(0) % colors.length];

  return (
    <Layout>
      <div style={{ maxWidth:900, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, margin:0 }}>Clientes</h1>
            <p style={{ color:'#555', fontSize:13, marginTop:4 }}>{clientes.length} cliente{clientes.length!==1?'s':''} cadastrado{clientes.length!==1?'s':''}</p>
          </div>
          <button onClick={() => navigate('/clientes/novo')}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', borderRadius:10, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            <Plus size={15}/> Novo Cliente
          </button>
        </div>

        {/* Search */}
        <div style={{ position:'relative', marginBottom:20 }}>
          <Search size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#444' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, telefone ou CPF..."
            style={{ ...inp({ paddingLeft:38, fontSize:14, padding:'12px 14px 12px 38px' }), border:'1px solid rgba(255,255,255,.07)' }}/>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'48px', color:'#555' }}>Carregando...</div>
        ) : !filtered.length ? (
          <div style={{ textAlign:'center', padding:'48px', color:'#555' }}>
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map(c => {
              const isExpanded = expanded === c._id;
              const color = colorFor(c.name);
              return (
                <div key={c._id} style={{ background:'#0f0f14', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, overflow:'hidden', transition:'all .2s' }}>
                  {/* Main row */}
                  <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px' }}>
                    {/* Avatar */}
                    <div style={{ width:42, height:42, borderRadius:'50%', background:`${color}22`, border:`2px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', color, fontWeight:800, fontSize:14, flexShrink:0 }}>
                      {initials(c.name)}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:'#fff', fontWeight:700, fontSize:14, marginBottom:3 }}>{c.name}</div>
                      <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                        {c.phone && <span style={{ color:'#666', fontSize:12, display:'flex', alignItems:'center', gap:4 }}><Phone size={10}/>{c.phone}</span>}
                        {c.email && <span style={{ color:'#666', fontSize:12, display:'flex', alignItems:'center', gap:4 }}><Mail size={10}/>{c.email}</span>}
                        {c.cpf   && <span style={{ color:'#666', fontSize:12, display:'flex', alignItems:'center', gap:4 }}><Hash size={10}/>{c.cpf}</span>}
                        {c.city  && <span style={{ color:'#666', fontSize:12, display:'flex', alignItems:'center', gap:4 }}><MapPin size={10}/>{c.city}{c.state?`/${c.state}`:''}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                      {c.phone && (
                        <button onClick={() => sendWhats(c)} title="WhatsApp"
                          style={{ width:32, height:32, borderRadius:8, background:'rgba(37,211,102,.1)', border:'1px solid rgba(37,211,102,.2)', color:'#25D366', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                          💬
                        </button>
                      )}
                      <button onClick={() => startEdit(c)} title="Editar"
                        style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#888', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Edit2 size={13}/>
                      </button>
                      <button onClick={() => remove(c._id, c.name)} title="Excluir"
                        style={{ width:32, height:32, borderRadius:8, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.15)', color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Trash2 size={13}/>
                      </button>
                      <button onClick={() => setExpanded(isExpanded ? null : c._id)}
                        style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', color:'#555', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {isExpanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ borderTop:'1px solid rgba(255,255,255,.05)', padding:'14px 18px', background:'rgba(255,255,255,.02)', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                      {[
                        ['CPF', c.cpf, Hash],
                        ['Telefone', c.phone, Phone],
                        ['Email', c.email, Mail],
                        ['Endereço', c.address, MapPin],
                        ['Cidade', c.city ? `${c.city}${c.state?'/'+c.state:''}` : '', MapPin],
                        ['Complemento', c.complement, MapPin],
                      ].map(([label, value, Icon]) => value ? (
                        <div key={label}>
                          <div style={{ color:'#444', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>{label}</div>
                          <div style={{ color:'#ccc', fontSize:13 }}>{value}</div>
                        </div>
                      ) : null)}
                      {c.notes && (
                        <div style={{ gridColumn:'1/-1' }}>
                          <div style={{ color:'#444', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>Observações</div>
                          <div style={{ color:'#888', fontSize:13, lineHeight:1.6 }}>{c.notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de edição */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20, overflowY:'auto' }}>
          <div style={{ background:'#0d0d14', border:'1px solid rgba(255,255,255,.1)', borderRadius:20, padding:28, width:'100%', maxWidth:500, maxHeight:'85vh', overflowY:'auto', margin:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ color:'#fff', fontSize:16, fontWeight:800, margin:0 }}>Editar — {editing.name}</h2>
              <button onClick={() => setEditing(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#555' }}><X size={20}/></button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {/* Nome */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Nome *</label>
                <input value={editForm.name} onChange={e => setEditForm(f=>({...f,name:e.target.value}))} style={inp()} placeholder="Nome completo"/>
              </div>
              {/* CPF */}
              <div>
                <label style={lbl}>CPF</label>
                <input value={editForm.cpf} onChange={e => setEditForm(f=>({...f,cpf:fmtCPF(e.target.value)}))} style={inp()} placeholder="000.000.000-00"/>
              </div>
              {/* Telefone */}
              <div>
                <label style={lbl}>Telefone</label>
                <input value={editForm.phone} onChange={e => setEditForm(f=>({...f,phone:fmtPhone(e.target.value)}))} style={inp()} placeholder="(37) 99999-0000"/>
              </div>
              {/* Email */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f=>({...f,email:e.target.value}))} style={inp()} placeholder="email@exemplo.com"/>
              </div>
              {/* Endereço */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Endereço</label>
                <input value={editForm.address} onChange={e => setEditForm(f=>({...f,address:e.target.value}))} style={inp()} placeholder="Rua, número"/>
              </div>
              {/* Cidade + Estado */}
              <div>
                <label style={lbl}>Cidade</label>
                <input value={editForm.city} onChange={e => setEditForm(f=>({...f,city:e.target.value}))} style={inp()} placeholder="Divinópolis"/>
              </div>
              <div>
                <label style={lbl}>UF</label>
                <input value={editForm.state||''} onChange={e => setEditForm(f=>({...f,state:e.target.value.toUpperCase().slice(0,2)}))} style={inp()} placeholder="MG" maxLength={2}/>
              </div>
              {/* Complemento */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Complemento</label>
                <input value={editForm.complement} onChange={e => setEditForm(f=>({...f,complement:e.target.value}))} style={inp()} placeholder="Apto, bloco..."/>
              </div>
              {/* Notas */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Observações</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(f=>({...f,notes:e.target.value}))} rows={3}
                  style={{ ...inp(), resize:'vertical', lineHeight:1.6 }} placeholder="Notas sobre o cliente..."/>
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={() => setEditing(null)}
                style={{ flex:1, padding:'11px', borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#888', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Cancelar
              </button>
              <button onClick={saveEdit} disabled={saving}
                style={{ flex:2, padding:'11px', borderRadius:10, background:`linear-gradient(135deg,${OR},#C85A00)`, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7, opacity:saving?.6:1 }}>
                <Save size={14}/> {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
