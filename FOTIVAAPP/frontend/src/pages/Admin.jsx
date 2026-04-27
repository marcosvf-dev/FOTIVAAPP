import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Users, DollarSign, TrendingUp, Clock, Search,
  ChevronLeft, ChevronRight, Shield, LogOut,
  Tag, Plus, Trash2, ToggleLeft, ToggleRight,
  Edit2, X, Save, Check, AlertCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: API });

const STATUS_BADGE = {
  active:    { bg:'rgba(34,197,94,.12)',  color:'#22C55E', label:'Ativo' },
  trial:     { bg:'rgba(59,130,246,.12)', color:'#3B82F6', label:'Trial' },
  expired:   { bg:'rgba(239,68,68,.12)',  color:'#EF4444', label:'Expirado' },
  cancelled: { bg:'rgba(136,136,136,.12)',color:'#888',    label:'Cancelado' },
};
const PLAN_BADGE = {
  starter: { bg:'rgba(34,197,94,.12)',  color:'#22C55E', label:'Starter' },
  normal:  { bg:'rgba(59,130,246,.12)', color:'#3B82F6', label:'Normal' },
  pro:     { bg:'rgba(232,119,34,.12)', color:'#E87722', label:'PRO' },
  free:    { bg:'rgba(136,136,136,.12)',color:'#888',    label:'Free' },
};

const card = { background:'#111', border:'1px solid rgba(255,255,255,.06)', borderRadius:16, padding:'18px 20px' };
const inp  = (extra={}) => ({ width:'100%', background:'#1a1a1a', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'9px 12px', color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit', ...extra });
const lbl  = { color:'#555', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 };
const btnP = { padding:'9px 20px', borderRadius:9, background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:7 };
const btnG = { padding:'9px 16px', borderRadius:9, background:'transparent', color:'#888', border:'1px solid rgba(255,255,255,.1)', fontSize:13, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:7 };

export default function AdminPanel() {
  const [token,    setToken]    = useState(localStorage.getItem('admin_token'));
  const [loginF,   setLoginF]   = useState({ email:'', password:'' });
  const [loginErr, setLoginErr] = useState('');
  const [tab,      setTab]      = useState('users'); // users | coupons
  const [stats,    setStats]    = useState(null);
  const [users,    setUsers]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [uLoading, setULoading] = useState(false);

  // Anúncios
  const [ads,          setAds]          = useState([]);
  const [adsLoading,   setAdsLoading]   = useState(false);
  const [adModal,      setAdModal]      = useState(false);
  const [editingAd,    setEditingAd]    = useState(null);
  const [adForm,       setAdForm]       = useState({ title:'', description:'', category:'outros', image:'', link:'', whatsapp:'', contactName:'', featured:false, expiresAt:'' });

  // Cupons
  const [coupons,  setCoupons]  = useState([]);
  const [cLoading, setCLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingC, setEditingC] = useState(null);
  const [cForm,    setCForm]    = useState({
    code:'', description:'', type:'percent', value:'',
    maxUses:'', validUntil:'', plans:['normal','pro'],
  });
  const [cSaving,  setCSaving]  = useState(false);
  const [cErr,     setCErr]     = useState('');

  const ah = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const login = async () => {
    setLoginErr('');
    try {
      const { data } = await api.post('/api/admin/login', loginF);
      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
    } catch (e) { setLoginErr(e.response?.data?.error || 'Credenciais inválidas'); }
  };

  const logout = () => { localStorage.removeItem('admin_token'); setToken(null); };

  // Stats
  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get('/api/admin/stats', ah());
      setStats(data);
    } catch { logout(); }
  }, [token]);

  // Usuários
  const loadUsers = useCallback(async () => {
    if (!token) return;
    setULoading(true);
    try {
      const { data } = await api.get(
        `/api/admin/users?page=${page}&limit=15&status=${filter}&search=${search}`, ah()
      );
      setUsers(data.users); setTotal(data.total); setPages(data.pages);
    } catch {}
    setULoading(false);
  }, [token, page, filter, search]);

  // Anúncios
  const loadAds = useCallback(async () => {
    setAdsLoading(true);
    try { const r = await axios.get('/api/ads/admin/all', { headers: { Authorization: `Bearer ${token}` } }); setAds(r.data); }
    catch { console.error('Erro ao carregar anúncios'); }
    setAdsLoading(false);
  }, [token]);

  useEffect(() => { if (tab === 'anuncios') loadAds(); }, [tab, loadAds]);

  async function saveAd() {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (editingAd) {
        await axios.put(`/api/ads/${editingAd._id}`, adForm, { headers });
      } else {
        await axios.post('/api/ads', adForm, { headers });
      }
      setAdModal(false); setEditingAd(null);
      setAdForm({ title:'', description:'', category:'outros', image:'', link:'', whatsapp:'', contactName:'', featured:false, expiresAt:'' });
      loadAds();
    } catch (e) { alert(e.response?.data?.error || 'Erro ao salvar anúncio'); }
  }

  async function deleteAd(id, title) {
    if (!window.confirm(`Deletar anúncio "${title}"?`)) return;
    try { await axios.delete(`/api/ads/${id}`, { headers: { Authorization: `Bearer ${token}` } }); loadAds(); }
    catch { alert('Erro ao deletar'); }
  }

  async function toggleAd(id, active) {
    try { await axios.put(`/api/ads/${id}`, { active: !active }, { headers: { Authorization: `Bearer ${token}` } }); loadAds(); }
    catch { alert('Erro ao atualizar'); }
  }

  function openAdModal(ad = null) {
    setEditingAd(ad);
    setAdForm(ad ? { title:ad.title||'', description:ad.description||'', category:ad.category||'outros', image:ad.image||'', link:ad.link||'', whatsapp:ad.whatsapp||'', contactName:ad.contactName||'', featured:!!ad.featured, expiresAt: ad.expiresAt ? ad.expiresAt.split('T')[0] : '' } : { title:'', description:'', category:'outros', image:'', link:'', whatsapp:'', contactName:'', featured:false, expiresAt:'' });
    setAdModal(true);
  }

  function handleAdImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3*1024*1024) { alert('Imagem muito grande. Máximo 3MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setAdForm(f => ({...f, image: reader.result}));
    reader.readAsDataURL(file);
  }

  // Cupons
  const loadCoupons = useCallback(async () => {
    if (!token) return;
    setCLoading(true);
    try {
      const { data } = await api.get('/api/coupons', ah());
      setCoupons(data);
    } catch {}
    setCLoading(false);
  }, [token]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { if (tab === 'coupons') loadCoupons(); }, [tab, loadCoupons]);

  const changePlan = async (userId, plan) => {
    try {
      await api.patch(`/api/admin/users/${userId}/plan`, { plan, status:'active', days:31 }, ah());
      loadUsers(); loadStats();
    } catch (e) { alert(e.response?.data?.error || 'Erro'); }
  };

  const blockUser = async (userId) => {
    if (!window.confirm('Bloquear este usuário?')) return;
    try {
      await api.patch(`/api/admin/users/${userId}/block`, {}, ah());
      loadUsers(); loadStats();
    } catch {}
  };

  // Abrir form para novo cupom
  const openNewCoupon = () => {
    setEditingC(null);
    setCForm({ code:'', description:'', type:'percent', value:'', maxUses:'', validUntil:'', plans:['normal','pro'] });
    setCErr('');
    setShowForm(true);
  };

  // Abrir form para editar cupom
  const openEditCoupon = (c) => {
    setEditingC(c);
    setCForm({
      code:        c.code,
      description: c.description || '',
      type:        c.type,
      value:       String(c.value),
      maxUses:     c.maxUses != null ? String(c.maxUses) : '',
      validUntil:  c.validUntil ? c.validUntil.slice(0,10) : '',
      plans:       c.plans || ['normal','pro'],
    });
    setCErr('');
    setShowForm(true);
  };

  const saveCoupon = async () => {
    if (!cForm.code.trim()) return setCErr('Código obrigatório');
    if (!cForm.value)       return setCErr('Valor obrigatório');
    setCSaving(true); setCErr('');
    try {
      const payload = {
        code:        cForm.code.trim().toUpperCase(),
        description: cForm.description.trim(),
        type:        cForm.type,
        value:       parseFloat(cForm.value),
        maxUses:     cForm.maxUses ? parseInt(cForm.maxUses) : null,
        validUntil:  cForm.validUntil || null,
        plans:       cForm.plans,
      };
      if (editingC) {
        await api.put(`/api/coupons/${editingC._id}`, payload, ah());
      } else {
        await api.post('/api/coupons', payload, ah());
      }
      setShowForm(false);
      loadCoupons();
    } catch (e) { setCErr(e.response?.data?.error || 'Erro ao salvar'); }
    setCSaving(false);
  };

  const toggleCoupon = async (id) => {
    try {
      await api.patch(`/api/coupons/${id}/toggle`, {}, ah());
      loadCoupons();
    } catch {}
  };

  const deleteCoupon = async (id, code) => {
    if (!window.confirm(`Deletar o cupom "${code}"?`)) return;
    try {
      await api.delete(`/api/coupons/${id}`, ah());
      loadCoupons();
    } catch {}
  };

  const togglePlan = (plan) => {
    setCForm(p => ({
      ...p,
      plans: p.plans.includes(plan)
        ? p.plans.filter(x => x !== plan)
        : [...p.plans, plan],
    }));
  };

  // ── LOGIN ────────────────────────────────────────────
  if (!token) return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.07)', borderRadius:20, padding:40, width:360 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,#E87722,#C85A00)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Shield size={18} color="#fff"/>
          </div>
          <div>
            <div style={{ color:'#fff', fontSize:15, fontWeight:800 }}>Fotiva Admin</div>
            <div style={{ color:'#555', fontSize:11 }}>Painel de controle</div>
          </div>
        </div>
        {loginErr && (
          <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'8px 12px', color:'#EF4444', fontSize:13, marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
            <AlertCircle size={14}/> {loginErr}
          </div>
        )}
        <div style={{ marginBottom:12 }}>
          <label style={lbl}>Email</label>
          <input value={loginF.email} onChange={e=>setLoginF({...loginF,email:e.target.value})} style={inp()}/>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={lbl}>Senha</label>
          <input type="password" value={loginF.password} onChange={e=>setLoginF({...loginF,password:e.target.value})}
            onKeyDown={e=>e.key==='Enter'&&login()} style={inp()}/>
        </div>
        <button onClick={login} style={{ ...btnP, width:'100%', justifyContent:'center', padding:11 }}>
          Entrar
        </button>
      </div>
    </div>
  );

  // ── APP ──────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#080808', fontFamily:'Inter,sans-serif', color:'#fff' }}>

      {/* Topbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 28px', background:'#0d0d0d', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#E87722,#C85A00)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Shield size={16} color="#fff"/>
          </div>
          <span style={{ fontWeight:800, fontSize:15 }}>Fotiva Admin</span>
        </div>
        {/* Tabs */}
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,.04)', borderRadius:10, padding:3 }}>
          {[
            { id:'users',   label:'Fotógrafos', icon:<Users size={13}/> },
            { id:'coupons', label:'Cupons',      icon:<Tag size={13}/> },
            { id:'anuncios', label:'Anúncios', icon:<Megaphone size={13}/> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', transition:'all .15s',
                background: tab===t.id ? 'linear-gradient(135deg,#E87722,#C85A00)' : 'transparent',
                color: tab===t.id ? '#fff' : '#666',
              }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <button onClick={logout} style={{ ...btnG, padding:'7px 12px', fontSize:12 }}>
          <LogOut size={13}/> Sair
        </button>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'22px 28px' }}>

        {/* Stats — aparece em ambas as tabs */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
            {[
              { label:'Total fotógrafos', value:stats.totalUsers,    icon:Users,      rgb:'59,130,246' },
              { label:'Ativos pagos',     value:stats.activeUsers,   icon:TrendingUp, rgb:'34,197,94' },
              { label:'Em trial',         value:stats.trialUsers,    icon:Clock,      rgb:'232,119,34' },
              { label:'MRR',              value:`R$${stats.mrr}`,    icon:DollarSign, rgb:'168,85,247' },
            ].map(c => {
              const Icon = c.icon;
              return (
                <div key={c.label} style={{ ...card, display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:`rgba(${c.rgb},.12)`, border:`1px solid rgba(${c.rgb},.2)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={18} color={`rgb(${c.rgb})`}/>
                  </div>
                  <div>
                    <div style={{ color:'#555', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>{c.label}</div>
                    <div style={{ color:`rgb(${c.rgb})`, fontSize:22, fontWeight:800, marginTop:2 }}>{c.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB FOTÓGRAFOS ── */}
        {tab === 'users' && (
          <>
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
              <div style={{ position:'relative', flex:1, minWidth:220 }}>
                <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#444' }}/>
                <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Buscar fotógrafo..."
                  style={inp({ paddingLeft:36 })}/>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {['all','active','trial','expired'].map(f => (
                  <button key={f} onClick={()=>{setFilter(f);setPage(1);}}
                    style={{ padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600, border:'1px solid', cursor:'pointer', fontFamily:'inherit',
                      background: filter===f ? '#E87722' : '#111',
                      borderColor: filter===f ? '#E87722' : 'rgba(255,255,255,.07)',
                      color: filter===f ? '#fff' : '#666',
                    }}>
                    {f==='all'?'Todos':f==='active'?'Ativos':f==='trial'?'Trial':'Expirados'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...card, padding:0, overflow:'hidden' }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                      {['Fotógrafo','Email','Plano','Status','Cadastro','Ações'].map(h => (
                        <th key={h} style={{ padding:'12px 16px', textAlign:'left', color:'#555', fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uLoading ? (
                      <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'#555' }}>Carregando...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'#555' }}>Nenhum fotógrafo encontrado</td></tr>
                    ) : users.map(u => {
                      const sb = STATUS_BADGE[u.subscription?.status] || STATUS_BADGE.expired;
                      const pb = PLAN_BADGE[u.subscription?.plan]     || PLAN_BADGE.free;
                      return (
                        <tr key={u._id} style={{ borderBottom:'1px solid rgba(255,255,255,.04)', transition:'background .1s' }}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.02)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'12px 16px' }}>
                            <div style={{ fontWeight:700, color:'#fff' }}>{u.name}</div>
                            {u.studioName && <div style={{ color:'#555', fontSize:11, marginTop:1 }}>{u.studioName}</div>}
                          </td>
                          <td style={{ padding:'12px 16px', color:'#888' }}>{u.email}</td>
                          <td style={{ padding:'12px 16px' }}>
                            <span style={{ background:pb.bg, color:pb.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{pb.label}</span>
                          </td>
                          <td style={{ padding:'12px 16px' }}>
                            <span style={{ background:sb.bg, color:sb.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{sb.label}</span>
                          </td>
                          <td style={{ padding:'12px 16px', color:'#555', fontSize:12 }}>
                            {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td style={{ padding:'12px 16px' }}>
                            <div style={{ display:'flex', gap:6 }}>
                              <select onChange={e=>e.target.value&&changePlan(u._id,e.target.value)} defaultValue=""
                                style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,.08)', borderRadius:6, color:'#888', fontSize:11, padding:'5px 8px', cursor:'pointer', fontFamily:'inherit' }}>
                                <option value="">Alterar plano...</option>
                                <option value="normal">→ Normal</option>
                                <option value="pro">→ PRO</option>
                                <option value="free">→ Free</option>
                              </select>
                              <button onClick={()=>blockUser(u._id)}
                                style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:6, color:'#EF4444', fontSize:11, padding:'5px 9px', cursor:'pointer', fontFamily:'inherit' }}>
                                Bloquear
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {pages > 1 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,.06)' }}>
                  <span style={{ color:'#555', fontSize:12 }}>{total} fotógrafos</span>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                      style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:7, padding:'6px 10px', color:page===1?'#333':'#888', cursor:page===1?'default':'pointer' }}>
                      <ChevronLeft size={14}/>
                    </button>
                    <span style={{ color:'#666', fontSize:13 }}>{page} / {pages}</span>
                    <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}
                      style={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,.07)', borderRadius:7, padding:'6px 10px', color:page===pages?'#333':'#888', cursor:page===pages?'default':'pointer' }}>
                      <ChevronRight size={14}/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TAB CUPONS ── */}
        {tab === 'coupons' && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <h2 style={{ fontSize:18, fontWeight:800, color:'#fff', letterSpacing:-.3 }}>Cupons de desconto</h2>
                <p style={{ color:'#555', fontSize:13, marginTop:3 }}>Crie e gerencie cupons para seus fotógrafos</p>
              </div>
              <button onClick={openNewCoupon} style={btnP}>
                <Plus size={15}/> Novo Cupom
              </button>
            </div>

            {/* Modal criar/editar cupom */}
            {showForm && (
              <div style={{ background:'rgba(0,0,0,.7)', position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
                onClick={e => e.target===e.currentTarget && setShowForm(false)}>
                <div style={{ background:'#141414', border:'1px solid rgba(255,255,255,.1)', borderRadius:20, padding:28, width:'100%', maxWidth:480 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
                    <h3 style={{ fontSize:16, fontWeight:800, color:'#fff' }}>
                      {editingC ? 'Editar Cupom' : 'Novo Cupom'}
                    </h3>
                    <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#555' }}><X size={18}/></button>
                  </div>

                  {cErr && (
                    <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'8px 12px', color:'#EF4444', fontSize:13, marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
                      <AlertCircle size={13}/> {cErr}
                    </div>
                  )}

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={lbl}>Código do cupom *</label>
                      <input value={cForm.code} onChange={e=>setCForm({...cForm,code:e.target.value.toUpperCase()})}
                        placeholder="Ex: LANCAMENTO50" style={inp({ letterSpacing:1, textTransform:'uppercase' })}
                        disabled={!!editingC}/>
                    </div>

                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={lbl}>Descrição</label>
                      <input value={cForm.description} onChange={e=>setCForm({...cForm,description:e.target.value})}
                        placeholder="Ex: 50% de desconto no lançamento" style={inp()}/>
                    </div>

                    <div>
                      <label style={lbl}>Tipo de desconto *</label>
                      <select value={cForm.type} onChange={e=>setCForm({...cForm,type:e.target.value})}
                        style={inp({ appearance:'none', cursor:'pointer' })}>
                        <option value="percent">Porcentagem (%)</option>
                        <option value="fixed">Valor fixo (R$)</option>
                      </select>
                    </div>

                    <div>
                      <label style={lbl}>
                        {cForm.type==='percent' ? 'Desconto (%)' : 'Desconto (R$)'} *
                      </label>
                      <input type="number" min="0" step={cForm.type==='percent'?'1':'0.01'}
                        max={cForm.type==='percent'?'100':undefined}
                        value={cForm.value} onChange={e=>setCForm({...cForm,value:e.target.value})}
                        placeholder={cForm.type==='percent'?'50':'10.00'} style={inp()}/>
                    </div>

                    <div>
                      <label style={lbl}>Limite de usos</label>
                      <input type="number" min="1" value={cForm.maxUses}
                        onChange={e=>setCForm({...cForm,maxUses:e.target.value})}
                        placeholder="Ilimitado" style={inp()}/>
                    </div>

                    <div>
                      <label style={lbl}>Validade</label>
                      <input type="date" value={cForm.validUntil}
                        onChange={e=>setCForm({...cForm,validUntil:e.target.value})} style={inp()}/>
                    </div>

                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={lbl}>Planos aceitos</label>
                      <div style={{ display:'flex', gap:8 }}>
                        {['normal','pro'].map(p => (
                          <button key={p} onClick={()=>togglePlan(p)}
                            style={{ padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:600, border:'1px solid', cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
                              background: cForm.plans.includes(p) ? (p==='pro'?'rgba(232,119,34,.15)':'rgba(59,130,246,.15)') : 'transparent',
                              borderColor: cForm.plans.includes(p) ? (p==='pro'?'rgba(232,119,34,.4)':'rgba(59,130,246,.4)') : 'rgba(255,255,255,.1)',
                              color: cForm.plans.includes(p) ? (p==='pro'?'#E87722':'#3B82F6') : '#555',
                            }}>
                            {cForm.plans.includes(p) && <Check size={12} style={{ display:'inline', marginRight:4 }}/>}
                            Plano {p.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preview do desconto */}
                  {cForm.value && (
                    <div style={{ background:'rgba(232,119,34,.06)', border:'1px solid rgba(232,119,34,.15)', borderRadius:10, padding:'10px 14px', marginTop:14 }}>
                      <p style={{ color:'#E87722', fontSize:12, fontWeight:600 }}>
                        Preview:
                        {cForm.type==='percent'
                          ? ` Normal R$${(29.90*(1-cForm.value/100)).toFixed(2)}/mês · PRO R$${(39.90*(1-cForm.value/100)).toFixed(2)}/mês`
                          : ` Normal R$${Math.max(0,29.90-parseFloat(cForm.value||0)).toFixed(2)}/mês · PRO R$${Math.max(0,39.90-parseFloat(cForm.value||0)).toFixed(2)}/mês`
                        }
                      </p>
                    </div>
                  )}

                  <div style={{ display:'flex', gap:10, marginTop:22 }}>
                    <button onClick={()=>setShowForm(false)} style={{ ...btnG, flex:1, justifyContent:'center' }}>Cancelar</button>
                    <button onClick={saveCoupon} disabled={cSaving} style={{ ...btnP, flex:2, justifyContent:'center', opacity:cSaving?.6:1 }}>
                      <Save size={14}/> {cSaving ? 'Salvando...' : editingC ? 'Salvar alterações' : 'Criar cupom'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de cupons */}
            {cLoading ? (
              <div style={{ textAlign:'center', padding:60, color:'#555' }}>Carregando cupons...</div>
            ) : coupons.length === 0 ? (
              <div style={{ ...card, textAlign:'center', padding:60 }}>
                <Tag size={40} color="#333" style={{ marginBottom:16 }}/>
                <p style={{ color:'#555', fontSize:15, marginBottom:20 }}>Nenhum cupom criado ainda</p>
                <button onClick={openNewCoupon} style={{ ...btnP, display:'inline-flex' }}>
                  <Plus size={15}/> Criar primeiro cupom
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {coupons.map(c => {
                  const usagePct = c.maxUses ? Math.round((c.usedCount/c.maxUses)*100) : null;
                  const expired  = c.validUntil && new Date(c.validUntil) < new Date();
                  return (
                    <div key={c._id} style={{ ...card, display:'flex', alignItems:'center', gap:16,
                      opacity: !c.active || expired ? .6 : 1,
                      borderColor: c.active && !expired ? 'rgba(255,255,255,.06)' : 'rgba(239,68,68,.15)',
                    }}>
                      {/* Código */}
                      <div style={{ flexShrink:0 }}>
                        <div style={{ background:'rgba(232,119,34,.1)', border:'1px solid rgba(232,119,34,.2)', borderRadius:8, padding:'6px 12px' }}>
                          <span style={{ color:'#E87722', fontSize:14, fontWeight:800, letterSpacing:1 }}>{c.code}</span>
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                          <span style={{ color:'#fff', fontSize:14, fontWeight:700 }}>
                            {c.type==='percent' ? `${c.value}% off` : `R$${c.value.toFixed(2)} off`}
                          </span>
                          {!c.active && <span style={{ background:'rgba(239,68,68,.12)', color:'#EF4444', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Inativo</span>}
                          {expired   && <span style={{ background:'rgba(239,68,68,.12)', color:'#EF4444', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>Expirado</span>}
                          {c.plans.map(p => (
                            <span key={p} style={{ background:p==='pro'?'rgba(232,119,34,.1)':'rgba(59,130,246,.1)', color:p==='pro'?'#E87722':'#3B82F6', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>
                              {p.toUpperCase()}
                            </span>
                          ))}
                        </div>
                        {c.description && <p style={{ color:'#666', fontSize:12, marginBottom:6 }}>{c.description}</p>}
                        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                          <span style={{ color:'#555', fontSize:11 }}>
                            Usado: {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''} vez{c.usedCount!==1?'es':''}
                          </span>
                          {c.validUntil && (
                            <span style={{ color:expired?'#EF4444':'#555', fontSize:11 }}>
                              Válido até: {new Date(c.validUntil).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                        {/* Barra de uso */}
                        {usagePct !== null && (
                          <div style={{ height:3, background:'rgba(255,255,255,.06)', borderRadius:3, overflow:'hidden', marginTop:8, maxWidth:200 }}>
                            <div style={{ width:`${usagePct}%`, height:'100%', background:'linear-gradient(90deg,#E87722,#FF9A3C)', borderRadius:3 }}/>
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                        <button onClick={()=>openEditCoupon(c)} title="Editar"
                          style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:8, padding:'7px 11px', color:'#888', cursor:'pointer', display:'flex', alignItems:'center' }}>
                          <Edit2 size={14}/>
                        </button>
                        <button onClick={()=>toggleCoupon(c._id)} title={c.active?'Desativar':'Ativar'}
                          style={{ background: c.active?'rgba(34,197,94,.08)':'rgba(255,255,255,.04)', border:`1px solid ${c.active?'rgba(34,197,94,.2)':'rgba(255,255,255,.08)'}`, borderRadius:8, padding:'7px 11px', color:c.active?'#22C55E':'#888', cursor:'pointer', display:'flex', alignItems:'center' }}>
                          {c.active ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>}
                        </button>
                        <button onClick={()=>deleteCoupon(c._id, c.code)} title="Deletar"
                          style={{ background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.15)', borderRadius:8, padding:'7px 11px', color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center' }}>
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── ANÚNCIOS ─────────────────────────── */}
        {tab === 'anuncios' && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <h2 style={{ fontSize:18, fontWeight:800, color:'#fff', letterSpacing:-.3 }}>Anúncios & Parceiros</h2>
                <p style={{ color:'#555', fontSize:13, marginTop:3 }}>Gerencie os anúncios exibidos no app</p>
              </div>
              <button onClick={() => openAdModal()}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                <Plus size={15}/> Novo Anúncio
              </button>
            </div>

            {adsLoading ? (
              <div style={{ textAlign:'center', padding:48, color:'#555' }}>Carregando...</div>
            ) : !ads.length ? (
              <div style={{ textAlign:'center', padding:48, color:'#555' }}>
                <Megaphone size={36} color="#333" style={{ marginBottom:12 }}/>
                <div>Nenhum anúncio cadastrado ainda</div>
                <div style={{ fontSize:13, marginTop:6 }}>Clique em "Novo Anúncio" para começar</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {ads.map(ad => (
                  <div key={ad._id} style={{ background:'#111', border:`1px solid ${ad.active?'rgba(255,255,255,.07)':'rgba(255,255,255,.03)'}`, borderRadius:14, padding:'16px 18px', display:'flex', gap:14, alignItems:'flex-start', opacity:ad.active?1:.5 }}>
                    {/* Imagem */}
                    <div style={{ width:70, height:70, borderRadius:10, background:'rgba(255,255,255,.05)', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {ad.image ? <img src={ad.image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <Megaphone size={24} color="#333"/>}
                    </div>
                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{ad.title}</span>
                        {ad.featured && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:5, background:'rgba(232,119,34,.15)', color:'#E87722' }}>⭐ DESTAQUE</span>}
                        <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:5, background: ad.active?'rgba(34,197,94,.1)':'rgba(239,68,68,.1)', color:ad.active?'#22C55E':'#EF4444' }}>{ad.active?'ATIVO':'INATIVO'}</span>
                      </div>
                      <div style={{ color:'#666', fontSize:12, marginBottom:6 }}>{ad.description?.slice(0,80)}{ad.description?.length>80?'...':''}</div>
                      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                        {ad.whatsapp && <span style={{ color:'#25D366', fontSize:11, display:'flex', alignItems:'center', gap:4 }}><MessageCircle size={10}/>{ad.whatsapp}</span>}
                        {ad.link && <span style={{ color:'#3B82F6', fontSize:11, display:'flex', alignItems:'center', gap:4 }}><ExternalLink size={10}/>{ad.link.slice(0,30)}</span>}
                        {ad.contactName && <span style={{ color:'#555', fontSize:11 }}>👤 {ad.contactName}</span>}
                        {ad.expiresAt && <span style={{ color: new Date(ad.expiresAt) < new Date() ? '#EF4444' : '#888', fontSize:11 }}>⏰ {new Date(ad.expiresAt).toLocaleDateString('pt-BR')}</span>}
                      </div>
                      <div style={{ color:'#444', fontSize:11, marginTop:4 }}>👁 {ad.views||0} views · 🖱 {ad.clicks||0} cliques</div>
                    </div>
                    {/* Ações */}
                    <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                      <button onClick={() => openAdModal(ad)}
                        style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:8, padding:'7px 12px', color:'#888', cursor:'pointer', fontSize:12, fontFamily:'inherit', whiteSpace:'nowrap' }}>
                        ✏️ Editar
                      </button>
                      <button onClick={() => toggleAd(ad._id, ad.active)}
                        style={{ background: ad.active?'rgba(239,68,68,.06)':'rgba(34,197,94,.06)', border:`1px solid ${ad.active?'rgba(239,68,68,.15)':'rgba(34,197,94,.15)'}`, borderRadius:8, padding:'7px 12px', color:ad.active?'#EF4444':'#22C55E', cursor:'pointer', fontSize:12, fontFamily:'inherit', whiteSpace:'nowrap' }}>
                        {ad.active ? '🔕 Desativar' : '✅ Ativar'}
                      </button>
                      <button onClick={() => deleteAd(ad._id, ad.title)}
                        style={{ background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.15)', borderRadius:8, padding:'7px 12px', color:'#EF4444', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>
                        🗑 Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal de anúncio */}
        {adModal && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20, overflowY:'auto' }}>
            <div style={{ background:'#0d0d14', border:'1px solid rgba(255,255,255,.1)', borderRadius:20, padding:28, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto', margin:'auto' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <h3 style={{ color:'#fff', fontSize:16, fontWeight:800, margin:0 }}>{editingAd ? '✏️ Editar Anúncio' : '📣 Novo Anúncio'}</h3>
                <button onClick={() => setAdModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#555' }}><X size={20}/></button>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[['title','Título do anúncio *','text','Ex: Câmeras Nikon — Divinópolis'],['contactName','Nome do anunciante','text','Ex: João Fotografia'],['whatsapp','WhatsApp (com DDD)','text','37999990000'],['link','Site ou link','text','https://meusite.com.br']].map(([k,l,t,ph]) => (
                  <div key={k}>
                    <label style={{ display:'block', color:'#666', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:5 }}>{l}</label>
                    <input type={t} value={adForm[k]} onChange={e => setAdForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}
                      style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'10px 13px', color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
                  </div>
                ))}

                <div>
                  <label style={{ display:'block', color:'#666', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:5 }}>Descrição</label>
                  <textarea value={adForm.description} onChange={e => setAdForm(f=>({...f,description:e.target.value}))} rows={3} placeholder="Descreva o produto ou serviço..."
                    style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'10px 13px', color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }}/>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ display:'block', color:'#666', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:5 }}>Categoria</label>
                    <select value={adForm.category} onChange={e => setAdForm(f=>({...f,category:e.target.value}))}
                      style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'10px 13px', color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                      {[['equipamentos','📷 Equipamentos'],['studios','🏢 Estúdios'],['laboratorios','🖼️ Laboratórios'],['software','💻 Software'],['cursos','🎓 Cursos'],['outros','✨ Outros']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block', color:'#666', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:5 }}>Vencimento</label>
                    <input type="date" value={adForm.expiresAt} onChange={e => setAdForm(f=>({...f,expiresAt:e.target.value}))}
                      style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'10px 13px', color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit' }}/>
                  </div>
                </div>

                {/* Upload de imagem */}
                <div>
                  <label style={{ display:'block', color:'#666', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Imagem do anúncio</label>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ width:80, height:60, borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px dashed rgba(255,255,255,.15)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {adForm.image ? <img src={adForm.image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ color:'#444', fontSize:11 }}>Sem imagem</span>}
                    </div>
                    <div>
                      <label htmlFor="ad-img-input" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, background:'rgba(232,119,34,.1)', border:'1px solid rgba(232,119,34,.2)', color:'#E87722', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                        📤 {adForm.image ? 'Trocar imagem' : 'Carregar imagem'}
                        <input id="ad-img-input" type="file" accept="image/*" onChange={handleAdImage} style={{ display:'none' }}/>
                      </label>
                      {adForm.image && <button type="button" onClick={() => setAdForm(f=>({...f,image:''}))} style={{ marginLeft:8, background:'none', border:'none', color:'#EF4444', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>✕ Remover</button>}
                      <div style={{ color:'#444', fontSize:11, marginTop:5 }}>PNG, JPG · Máx 3MB</div>
                    </div>
                  </div>
                </div>

                {/* Destaque */}
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                  <input type="checkbox" checked={adForm.featured} onChange={e => setAdForm(f=>({...f,featured:e.target.checked}))} style={{ width:16, height:16, accentColor:'#E87722' }}/>
                  <div>
                    <div style={{ color:'#fff', fontSize:13, fontWeight:600 }}>⭐ Anúncio em destaque</div>
                    <div style={{ color:'#555', fontSize:11 }}>Aparece no topo da lista</div>
                  </div>
                </label>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <button onClick={() => setAdModal(false)}
                  style={{ flex:1, padding:'11px', borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', color:'#888', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  Cancelar
                </button>
                <button onClick={saveAd}
                  style={{ flex:2, padding:'11px', borderRadius:10, background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  💾 {editingAd ? 'Salvar alterações' : 'Criar anúncio'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
