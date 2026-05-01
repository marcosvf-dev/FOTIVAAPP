import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Save, Camera, Bell, User, Phone, Mail, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export default function Configuracoes() {
  const { user, updateUser } = useAuth();
  const [tab,          setTab]          = useState('perfil');
  const [loading,      setLoading]      = useState(false);
  const [form,         setForm]         = useState({ name:'', studioName:'', phone:'', email:'', profileImage:'', studioLogo:'', document:'' });
  const [pushActive,   setPushActive]   = useState(() => localStorage.getItem('push_active') === 'true');
  const [notifStatus,  setNotifStatus]  = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [notifLoading, setNotifLoading] = useState(false);

  // LGPD states
  const [lgpdStatus,  setLgpdStatus]  = useState(null);
  const [lgpdLoading, setLgpdLoading] = useState(false);
  const [lgpdMsg,     setLgpdMsg]     = useState('');

  useEffect(() => {
    if (user) {
      const savedImg  = localStorage.getItem('profile_image') || user.profileImage || '';
      const savedLogo = localStorage.getItem('studio_logo')   || user.studioLogo   || '';
      setForm({ name:user.name||'', studioName:user.studioName||'', phone:user.phone||'', email:user.email||'', profileImage:savedImg, studioLogo:savedLogo, document:user.document||'' });
    }
  }, [user]);

  useEffect(() => {
    const saved     = localStorage.getItem('push_active') === 'true';
    const savedPerm = localStorage.getItem('push_permission') || 'default';
    if (saved) setPushActive(true);
    if (typeof Notification !== 'undefined') {
      const perm = Notification.permission;
      setNotifStatus(perm);
      localStorage.setItem('push_permission', perm);
      if (perm !== 'granted' && saved) {
        setPushActive(false);
        localStorage.removeItem('push_active');
      }
    } else if (savedPerm === 'granted' && saved) {
      setNotifStatus('granted');
    }
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) { setPushActive(true); localStorage.setItem('push_active','true'); }
        });
      }).catch(() => {});
    }
  }, []);

  // Carrega status LGPD quando entra na aba
  useEffect(() => {
    if (tab === 'privacidade') {
      api.get('/api/lgpd/status')
        .then(r => setLgpdStatus(r.data))
        .catch(() => {});
    }
  }, [tab]);

  async function ativarNotificacoes() {
    setNotifLoading(true);
    try {
      if (!('Notification' in window)) {
        toast.error('Este navegador não suporta notificações push.');
        setNotifLoading(false);
        return;
      }
      const perm = await Notification.requestPermission();
      setNotifStatus(perm);
      if (perm !== 'granted') {
        toast.error('Permissão negada. Vá em Configurações do celular → Safari/Chrome → Notificações → Permitir para Fotiva.');
        setNotifLoading(false);
        return;
      }
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
          await reg.update();
          await navigator.serviceWorker.ready;
          try {
            const { data: vapidData } = await api.get('/api/push/vapid-key');
            if (vapidData?.key) {
              const existing = await reg.pushManager.getSubscription();
              if (existing) await existing.unsubscribe();
              const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidData.key) });
              await api.post('/api/push/subscribe', { subscription: sub.toJSON() });
            }
          } catch (vapidErr) {
            console.log('VAPID não disponível:', vapidErr.message);
          }
        } catch (swErr) {
          console.log('SW error:', swErr.message);
        }
      }
      setPushActive(true);
      localStorage.setItem('push_active', 'true');
      localStorage.setItem('push_permission', 'granted');
      toast.success('✅ Notificações ativadas!');
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('🎉 Fotiva — Notificações ativas!', { body: 'Você será avisado antes dos seus eventos.', icon: '/favicon.ico' });
        }
      }, 1000);
    } catch (e) {
      toast.error('Erro ao ativar: ' + (e.message || 'Tente novamente'));
    }
    setNotifLoading(false);
  }

  async function desativarNotificacoes() {
    setNotifLoading(true);
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      await api.post('/api/push/unsubscribe').catch(() => {});
      setPushActive(false);
      localStorage.removeItem('push_active');
      localStorage.setItem('push_permission', 'default');
      toast.success('Notificações desativadas!');
    } catch { toast.error('Erro ao desativar'); }
    finally { setNotifLoading(false); }
  }

  async function testarNotificacao() {
    setNotifLoading(true);
    try {
      await api.post('/api/push/test');
      toast.success('🔔 Notificação enviada pelo servidor!');
    } catch {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.active?.postMessage({ type: 'SHOW_NOTIFICATION', title: '🎉 Fotiva — Teste', body: 'Notificações funcionando!', url: '/dashboard' });
          toast.success('🔔 Notificação de teste enviada!');
        } else if (Notification.permission === 'granted') {
          new Notification('🎉 Fotiva — Teste', { body: 'Notificações funcionando!', icon: '/favicon.ico' });
          toast.success('🔔 Notificação local enviada!');
        }
      } catch { toast.error('Erro ao testar.'); }
    }
    setNotifLoading(false);
  }

  function urlBase64ToUint8Array(b) {
    const pad    = '='.repeat((4 - b.length % 4) % 4);
    const base64 = (b + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw    = window.atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 3MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setForm(p => ({ ...p, profileImage: reader.result })); localStorage.setItem('profile_image', reader.result); toast.success('Foto carregada! Clique em salvar para confirmar.'); };
    reader.readAsDataURL(file);
  };

  const handleStudioLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Logo muito grande. Máximo 3MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setForm(p => ({ ...p, studioLogo: reader.result })); localStorage.setItem('studio_logo', reader.result); toast.success('Logo do estúdio carregada!'); };
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/api/auth/profile', { name: form.name, studioName: form.studioName, phone: form.phone, profileImage: form.profileImage, studioLogo: form.studioLogo, document: form.document });
      updateUser(data);
      if (form.profileImage) localStorage.setItem('profile_image', form.profileImage);
      if (form.studioLogo)   localStorage.setItem('studio_logo',   form.studioLogo);
      toast.success('Perfil atualizado!');
    } catch { toast.error('Erro ao salvar perfil'); }
    finally { setLoading(false); }
  };

  const openPortal = async () => {
    try {
      const { data } = await api.post('/api/subscription/portal');
      window.location.href = data.portalUrl;
    } catch (e) { toast.error(e.response?.data?.error || 'Configure o Portal no Stripe Dashboard'); }
  };

  // LGPD functions
  const exportarDados = async () => {
    setLgpdLoading(true);
    try {
      const res  = await api.get('/api/lgpd/meus-dados', { responseType: 'blob' });
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'meus-dados-fotiva.json';
      a.click();
      setLgpdMsg('✅ Dados exportados com sucesso!');
    } catch { setLgpdMsg('❌ Erro ao exportar dados.'); }
    setLgpdLoading(false);
  };

  const solicitarExclusao = async () => {
    if (!window.confirm('Tem certeza? Sua conta e TODOS os dados serão excluídos em 30 dias. Pode cancelar antes do prazo.')) return;
    setLgpdLoading(true);
    try {
      const { data } = await api.post('/api/lgpd/solicitar-exclusao', { motivo: 'Solicitado pelo usuário' });
      setLgpdMsg(data.info || data.message);
      setLgpdStatus(s => ({ ...s, exclusaoPendente: true }));
    } catch { setLgpdMsg('❌ Erro ao solicitar exclusão.'); }
    setLgpdLoading(false);
  };

  const cancelarExclusao = async () => {
    setLgpdLoading(true);
    try {
      await api.post('/api/lgpd/cancelar-exclusao');
      setLgpdMsg('✅ Solicitação cancelada.');
      setLgpdStatus(s => ({ ...s, exclusaoPendente: false }));
    } catch { setLgpdMsg('❌ Erro ao cancelar.'); }
    setLgpdLoading(false);
  };

  const PLAN_INFO = {
    starter: { name:'Starter', color:'#22C55E', bg:'rgba(34,197,94,.08)',   border:'rgba(34,197,94,.2)',   price:'R$19,90', desc:'Até 20 clientes · Agenda · Financeiro básico' },
    normal:  { name:'Normal',  color:'#E87722', bg:'rgba(232,119,34,.08)',  border:'rgba(232,119,34,.2)',  price:'R$39,90', desc:'Clientes ilimitados · IA · GPS · Google Agenda' },
    pro:     { name:'PRO',     color:'#A855F7', bg:'rgba(168,85,247,.08)',  border:'rgba(168,85,247,.2)',  price:'R$69,90', desc:'Tudo do Normal + Galeria + Reconhecimento facial' },
    free:    { name:'Free',    color:'#888',    bg:'rgba(136,136,136,.08)', border:'rgba(136,136,136,.2)', price:'—',       desc:'Período de avaliação' },
  };

  const plan     = user?.subscription?.plan || 'free';
  const status   = user?.subscription?.status;
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  const initials = (form.name || 'F').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();

  const TABS = [['perfil','Perfil'],['notificacoes','Notificações'],['conta','Conta'],['privacidade','🔒 Privacidade']];
  const cardStyle  = { background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:24, marginBottom:16 };
  const labelStyle = { display:'block', fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 };
  const lgpdCard   = { background:'#1a1a1a', borderRadius:12, border:'1px solid #2a2a2a', padding:'20px', marginBottom:16 };
  const lgpdBtn    = (color) => ({ background:color, color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', cursor: lgpdLoading ? 'not-allowed' : 'pointer', fontSize:14, fontWeight:600, opacity: lgpdLoading ? 0.6 : 1, fontFamily:'inherit' });

  return (
    <Layout>
      <div style={{ maxWidth:600, margin:'0 auto' }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, letterSpacing:'-0.4px' }}>Configurações</h1>
          <p style={{ color:'#555', fontSize:13, marginTop:4 }}>Gerencie sua conta e preferências</p>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:22, background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:4 }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, padding:'8px 12px', borderRadius:8, fontSize:13, fontWeight:600, border:'none', cursor:'pointer', transition:'all .15s',
                background: tab===id ? 'linear-gradient(135deg,#E87722,#C85A00)' : 'transparent',
                color: tab===id ? '#fff' : '#555',
                boxShadow: tab===id ? '0 4px 12px rgba(232,119,34,0.3)' : 'none',
                fontFamily:'inherit',
              }}>{label}</button>
          ))}
        </div>

        {/* ── PERFIL ─────────────────────────────── */}
        {tab === 'perfil' && (
          <form onSubmit={saveProfile}>
            <div style={cardStyle}>
              <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:24 }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{ width:76, height:76, borderRadius:'50%', background:'linear-gradient(135deg,#E87722,#C85A00)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', border:'3px solid rgba(232,119,34,0.3)' }}>
                    {form.profileImage
                      ? <img src={form.profileImage} alt="perfil" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      : <span style={{ color:'#fff', fontWeight:800, fontSize:24 }}>{initials}</span>}
                  </div>
                  <label htmlFor="photo-input" style={{ position:'absolute', bottom:0, right:0, width:26, height:26, background:'#E87722', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'2px solid #0A0A0A' }}>
                    <Camera size={13} color="#fff"/>
                    <input id="photo-input" type="file" accept="image/*" onChange={handleImage} style={{ display:'none' }}/>
                  </label>
                </div>
                <div>
                  <div style={{ color:'#fff', fontWeight:700, fontSize:16 }}>{form.name || 'Fotógrafo'}</div>
                  <div style={{ color:'#E87722', fontSize:13, marginTop:3 }}>{form.studioName || 'Sem estúdio definido'}</div>
                  <div style={{ color:'#555', fontSize:12, marginTop:2 }}>{form.email}</div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[['name','Nome completo',User,'text','Seu nome'],['studioName','Nome do estúdio',Camera,'text','Ex: MV Fotografia'],['phone','Telefone / WhatsApp',Phone,'tel','(11) 99999-9999'],['document','CPF ou CNPJ',User,'text','000.000.000-00 ou 00.000.000/0001-00']].map(([k,l,Icon,t,ph]) => (
                  <div key={k}>
                    <label style={labelStyle}>{l}</label>
                    <div style={{ position:'relative' }}>
                      <Icon size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#444' }}/>
                      <input className="f-input" type={t} placeholder={ph} value={form[k]}
                        onChange={e => setForm(p => ({...p,[k]:e.target.value}))}
                        style={{ paddingLeft:38 }}/>
                    </div>
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>Email</label>
                  <div style={{ position:'relative' }}>
                    <Mail size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#444' }}/>
                    <input className="f-input" type="email" value={form.email} disabled style={{ paddingLeft:38, opacity:0.5 }}/>
                  </div>
                  <p style={{ color:'#444', fontSize:11, marginTop:5 }}>Email não pode ser alterado</p>
                </div>
              </div>
            </div>

            {/* Logo do Estúdio */}
            <div style={{ marginTop:16 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Logo do Estúdio (para contratos)</label>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:80, height:50, borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px dashed rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                  {form.studioLogo
                    ? <img src={form.studioLogo} alt="logo" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
                    : <span style={{ color:'#444', fontSize:11, textAlign:'center', lineHeight:1.3 }}>Sem logo</span>}
                </div>
                <div style={{ flex:1 }}>
                  <label htmlFor="logo-input" style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 14px', borderRadius:8, background:'rgba(232,119,34,.1)', border:'1px solid rgba(232,119,34,.2)', color:'#E87722', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    📤 {form.studioLogo ? 'Trocar logo' : 'Carregar logo'}
                    <input id="logo-input" type="file" accept="image/*" onChange={handleStudioLogo} style={{ display:'none' }}/>
                  </label>
                  {form.studioLogo && (
                    <button type="button" onClick={() => { setForm(p=>({...p,studioLogo:''})); localStorage.removeItem('studio_logo'); }}
                      style={{ marginLeft:8, background:'none', border:'none', color:'#EF4444', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                      ✕ Remover
                    </button>
                  )}
                  <p style={{ color:'#444', fontSize:11, marginTop:5 }}>Aparece nos contratos. Se não tiver, só o nome do estúdio aparece.</p>
                </div>
              </div>
            </div>

            <button type="submit" className="f-btn f-btn-primary" disabled={loading} style={{ width:'100%', padding:'13px', fontSize:15, marginTop:16 }}>
              {loading ? 'Salvando...' : <><Save size={16}/> Salvar Alterações</>}
            </button>
          </form>
        )}

        {/* ── NOTIFICAÇÕES ───────────────────────── */}
        {tab === 'notificacoes' && (
          <div style={cardStyle}>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:'rgba(232,119,34,.1)', border:'1px solid rgba(232,119,34,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Bell size={20} color="#E87722"/>
              </div>
              <div>
                <div style={{ color:'#fff', fontWeight:700, fontSize:15 }}>Notificações Push</div>
                <div style={{ color:'#555', fontSize:13, marginTop:2 }}>Alertas no navegador e celular</div>
              </div>
            </div>
            <div style={{ background:'#161616', border:'1px solid rgba(255,255,255,.05)', borderRadius:12, padding:14, marginBottom:14 }}>
              <p style={{ color:'#777', fontSize:13, lineHeight:1.7 }}>
                📱 Funciona no celular e computador<br/>
                ⏰ 48h, 24h e 2h antes do evento<br/>
                🔔 Funciona mesmo com o app fechado
              </p>
            </div>
            {pushActive && notifStatus !== 'denied' && (
              <div style={{ background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:10, padding:'9px 14px', marginBottom:12, fontSize:13, color:'#22C55E' }}>
                ✅ Notificações push ativas
              </div>
            )}
            {notifStatus === 'denied' && (
              <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'9px 14px', marginBottom:12, fontSize:13, color:'#EF4444' }}>
                ❌ Bloqueado — clique no 🔒 na barra de endereço → Notificações → Permitir
              </div>
            )}
            <div style={{ display:'flex', gap:10 }}>
              {(!pushActive) ? (
                <button onClick={ativarNotificacoes} disabled={notifLoading}
                  style={{ flex:1, padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:notifLoading?.6:1 }}>
                  <Bell size={16}/> {notifLoading ? 'Ativando...' : 'Ativar Notificações'}
                </button>
              ) : (
                <>
                  <button onClick={testarNotificacao} disabled={notifLoading}
                    style={{ flex:1, padding:'11px', borderRadius:10, background:'rgba(34,197,94,.1)', color:'#22C55E', border:'1px solid rgba(34,197,94,.25)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    🔔 Testar
                  </button>
                  <button onClick={desativarNotificacoes} disabled={notifLoading}
                    style={{ flex:1, padding:'11px', borderRadius:10, background:'rgba(239,68,68,.08)', color:'#EF4444', border:'1px solid rgba(239,68,68,.2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    🔕 Desativar
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── CONTA ──────────────────────────────── */}
        {tab === 'conta' && (
          <div>
            <div style={cardStyle}>
              <div style={{ color:'#888', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:14 }}>Plano atual</div>
              {status === 'trial' && (
                <div style={{ background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.2)', borderRadius:10, padding:'8px 14px', marginBottom:12, fontSize:12, color:'#3B82F6', display:'flex', alignItems:'center', gap:7 }}>
                  ⏳ Período de trial — {user?.subscription?.trialDaysLeft || 0} dia(s) restante(s)
                </div>
              )}
              <div style={{ background:planInfo.bg, border:`1px solid ${planInfo.border}`, borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ color:planInfo.color, fontWeight:800, fontSize:17 }}>Plano {planInfo.name}</div>
                    <div style={{ color:'#666', fontSize:12, marginTop:3 }}>{planInfo.desc}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ color:'#fff', fontWeight:800, fontSize:22 }}>{planInfo.price}</div>
                    <div style={{ color:'#555', fontSize:11 }}>/mês</div>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <a href="/assinatura" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', textDecoration:'none', fontSize:14, fontWeight:700 }}>
                  🔄 Ver e trocar planos
                </a>
                {status === 'active' && (
                  <button onClick={openPortal}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,.1)', color:'#888', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    <ExternalLink size={14}/> Gerenciar assinatura (Stripe)
                  </button>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ color:'#888', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:14 }}>O que cada plano inclui</div>
              {[
                ['Clientes',           '20',  '∞',  '∞'],
                ['Agenda e eventos',   '✅',  '✅', '✅'],
                ['Controle financeiro','✅',  '✅', '✅'],
                ['Assistente IA',      '❌',  '✅', '✅'],
                ['Navegação GPS',      '❌',  '✅', '✅'],
                ['Galeria de fotos',   '❌',  '❌', '✅'],
                ['Reconhec. facial',   '❌',  '❌', '✅'],
              ].map(([feat, s, n, p]) => (
                <div key={feat} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,.04)', fontSize:12 }}>
                  <span style={{ color:'#888' }}>{feat}</span>
                  <span style={{ textAlign:'center', color: plan==='starter' ? '#22C55E' : '#555' }}>{s}</span>
                  <span style={{ textAlign:'center', color: plan==='normal'  ? '#E87722' : '#555' }}>{n}</span>
                  <span style={{ textAlign:'center', color: plan==='pro'     ? '#A855F7' : '#555' }}>{p}</span>
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, marginTop:10 }}>
                <span></span>
                {['starter','normal','pro'].map((p2, i) => (
                  <span key={p2} style={{ textAlign:'center', fontSize:10, fontWeight:700, color: plan===p2 ? ['#22C55E','#E87722','#A855F7'][i] : '#444', textTransform:'uppercase' }}>
                    {plan===p2 ? '▲ atual' : ['Starter','Normal','PRO'][i]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PRIVACIDADE (LGPD) ─────────────────── */}
        {tab === 'privacidade' && (
          <div>
            <h3 style={{ color:'#E87722', marginBottom:20, fontSize:16 }}>🔒 Seus Direitos e Privacidade (LGPD)</h3>

            {lgpdMsg && (
              <div style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:8, padding:12, marginBottom:16, color:'#ccc', fontSize:14 }}>
                {lgpdMsg}
              </div>
            )}

            <div style={lgpdCard}>
              <h4 style={{ color:'#fff', margin:'0 0 12px', fontSize:14 }}>📊 Dados que coletamos sobre você</h4>
              <ul style={{ color:'#aaa', fontSize:13, lineHeight:2, paddingLeft:20, margin:0 }}>
                <li>Nome, e-mail, telefone e dados do estúdio</li>
                <li>CPF/CNPJ (se fornecido)</li>
                <li>Clientes e eventos cadastrados</li>
                <li>Logs de acesso (IP, horário, páginas)</li>
                <li>Dados de pagamento (via Stripe)</li>
              </ul>
            </div>

            <div style={lgpdCard}>
              <h4 style={{ color:'#fff', margin:'0 0 8px', fontSize:14 }}>📥 Exportar meus dados</h4>
              <p style={{ color:'#aaa', fontSize:13, margin:'0 0 14px' }}>Baixe todos os seus dados armazenados no Fotiva em formato JSON.</p>
              <button style={lgpdBtn('#2563eb')} onClick={exportarDados} disabled={lgpdLoading}>
                {lgpdLoading ? 'Exportando...' : '⬇️ Baixar meus dados'}
              </button>
            </div>

            <div style={lgpdCard}>
              <h4 style={{ color:'#fff', margin:'0 0 8px', fontSize:14 }}>📄 Documentos legais</h4>
              <p style={{ color:'#aaa', fontSize:13, margin:'0 0 14px' }}>
                {lgpdStatus?.termoAceitoEm
                  ? `Termos aceitos em: ${new Date(lgpdStatus.termoAceitoEm).toLocaleDateString('pt-BR')}`
                  : 'Consulte nossos termos e política de privacidade.'}
              </p>
              <a href="/termos" style={{ ...lgpdBtn('#333'), display:'inline-block', textDecoration:'none', marginRight:10 }}>📄 Termos de Uso</a>
              <a href="/termos" style={{ ...lgpdBtn('#333'), display:'inline-block', textDecoration:'none' }}>🔒 Política de Privacidade</a>
            </div>

            <div style={{ ...lgpdCard, border:'1px solid #7f1d1d' }}>
              <h4 style={{ color:'#f87171', margin:'0 0 8px', fontSize:14 }}>🗑️ Excluir minha conta</h4>
              {lgpdStatus?.exclusaoPendente ? (
                <>
                  <p style={{ color:'#fca5a5', fontSize:13, margin:'0 0 14px' }}>
                    ⚠️ Exclusão agendada para {lgpdStatus.exclusaoAgendadaPara ? new Date(lgpdStatus.exclusaoAgendadaPara).toLocaleDateString('pt-BR') : '30 dias'}. Todos os dados serão removidos permanentemente.
                  </p>
                  <button style={lgpdBtn('#16a34a')} onClick={cancelarExclusao} disabled={lgpdLoading}>✋ Cancelar exclusão</button>
                </>
              ) : (
                <>
                  <p style={{ color:'#aaa', fontSize:13, margin:'0 0 14px' }}>Remove permanentemente todos os seus dados em 30 dias. Pode cancelar antes do prazo.</p>
                  <button style={lgpdBtn('#dc2626')} onClick={solicitarExclusao} disabled={lgpdLoading}>🗑️ Solicitar exclusão da conta</button>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
