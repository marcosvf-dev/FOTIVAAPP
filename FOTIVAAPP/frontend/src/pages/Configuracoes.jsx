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
  const [form,         setForm]         = useState({ name:'', studioName:'', phone:'', email:'', profileImage:'' });
  const [pushActive,   setPushActive]   = useState(() => localStorage.getItem('push_active') === 'true');
  const [notifStatus,  setNotifStatus]  = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const savedImg = localStorage.getItem('profile_image') || user.profileImage || '';
      setForm({ name:user.name||'', studioName:user.studioName||'', phone:user.phone||'', email:user.email||'', profileImage:savedImg });
    }
  }, [user]);

  useEffect(() => {
    // Restaura estado do localStorage primeiro
    const saved = localStorage.getItem('push_active') === 'true';
    const savedPerm = localStorage.getItem('push_permission') || 'default';
    if (saved) setPushActive(true);
    if (typeof Notification !== 'undefined') {
      const perm = Notification.permission;
      setNotifStatus(perm);
      localStorage.setItem('push_permission', perm);
      // Se permissão foi revogada, limpa
      if (perm !== 'granted' && saved) {
        setPushActive(false);
        localStorage.removeItem('push_active');
      }
    } else if (savedPerm === 'granted' && saved) {
      setNotifStatus('granted');
    }
    // Verifica subscription real se suportado
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) { setPushActive(true); localStorage.setItem('push_active','true'); }
        });
      }).catch(() => {});
    }
  }, []);

  async function ativarNotificacoes() {
    setNotifLoading(true);
    try {
      if (!('Notification' in window)) { toast.error('Navegador não suporta notificações'); return; }
      const perm = await Notification.requestPermission();
      setNotifStatus(perm);
      if (perm !== 'granted') { toast.error('Permissão negada. Ative nas configurações do navegador.'); return; }
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        try {
          const { data: vapidData } = await api.get('/api/push/vapid-key');
          if (vapidData.key) {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidData.key),
            });
            await api.post('/api/push/subscribe', { subscription: sub.toJSON() });
          }
        } catch {}
      }
      setPushActive(true);
      localStorage.setItem('push_active', 'true');
      localStorage.setItem('push_permission', 'granted');
      toast.success('Notificações ativadas!');
    } catch (e) { toast.error('Erro ao ativar: ' + e.message); }
    finally { setNotifLoading(false); }
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
      toast.success('Notificação enviada!');
    } catch {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('🎉 Fotiva — Teste', { body: 'Notificações funcionando!', icon: '/favicon.ico' });
        toast.success('Notificação local enviada!');
      } else { toast.error('Erro ao testar notificação'); }
    }
    setNotifLoading(false);
  }

  function urlBase64ToUint8Array(b) {
    const pad = '='.repeat((4 - b.length % 4) % 4);
    const base64 = (b + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 3MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(p => ({ ...p, profileImage: reader.result }));
      localStorage.setItem('profile_image', reader.result);
      toast.success('Foto carregada! Clique em salvar para confirmar.');
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/api/auth/profile', {
        name: form.name, studioName: form.studioName, phone: form.phone, profileImage: form.profileImage
      });
      updateUser(data);
      if (form.profileImage) localStorage.setItem('profile_image', form.profileImage);
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

  const PLAN_INFO = {
    starter: { name:'Starter',      color:'#22C55E', bg:'rgba(34,197,94,.08)',   border:'rgba(34,197,94,.2)',   price:'R$19,90', desc:'Até 20 clientes · Agenda · Financeiro básico' },
    normal:  { name:'Normal',       color:'#E87722', bg:'rgba(232,119,34,.08)',  border:'rgba(232,119,34,.2)',  price:'R$39,90', desc:'Clientes ilimitados · IA · GPS · Google Agenda' },
    pro:     { name:'PRO',          color:'#A855F7', bg:'rgba(168,85,247,.08)',  border:'rgba(168,85,247,.2)',  price:'R$69,90', desc:'Tudo do Normal + Galeria + Reconhecimento facial' },
    free:    { name:'Free',         color:'#888',    bg:'rgba(136,136,136,.08)', border:'rgba(136,136,136,.2)', price:'—',       desc:'Período de avaliação' },
  };

  const plan     = user?.subscription?.plan || 'free';
  const status   = user?.subscription?.status;
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;

  const initials = (form.name || 'F').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  const TABS = [['perfil','Perfil'],['notificacoes','Notificações'],['conta','Conta']];
  const cardStyle = { background:'#111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:24, marginBottom:16 };
  const labelStyle = { display:'block', fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 };

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
                {[['name','Nome completo',User,'text','Seu nome'],['studioName','Nome do estúdio',Camera,'text','Ex: MV Fotografia'],['phone','Telefone / WhatsApp',Phone,'tel','(11) 99999-9999']].map(([k,l,Icon,t,ph]) => (
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
            <button type="submit" className="f-btn f-btn-primary" disabled={loading} style={{ width:'100%', padding:'13px', fontSize:15 }}>
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

            {notifStatus === 'granted' && pushActive && (
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
              {(!pushActive || notifStatus !== 'granted') ? (
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
            {/* Plano atual */}
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

            {/* Comparativo rápido */}
            <div style={cardStyle}>
              <div style={{ color:'#888', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:14 }}>O que cada plano inclui</div>
              {[
                ['Clientes',           '20',   '∞',   '∞'],
                ['Agenda e eventos',   '✅',   '✅',  '✅'],
                ['Controle financeiro','✅',   '✅',  '✅'],
                ['Assistente IA',      '❌',   '✅',  '✅'],
                ['Navegação GPS',      '❌',   '✅',  '✅'],
                ['Galeria de fotos',   '❌',   '❌',  '✅'],
                ['Reconhec. facial',   '❌',   '❌',  '✅'],
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
                {['Starter','Normal','PRO'].map((p2,i) => (
                  <span key={p2} style={{ textAlign:'center', fontSize:10, fontWeight:700, color: plan===['starter','normal','pro'][i] ? ['#22C55E','#E87722','#A855F7'][i] : '#444', textTransform:'uppercase' }}>
                    {plan===['starter','normal','pro'][i] ? '▲ atual' : p2}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
