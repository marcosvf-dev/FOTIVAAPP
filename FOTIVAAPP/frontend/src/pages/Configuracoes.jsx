import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { Save, Camera, Bell, User, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export default function Configuracoes() {
  const { user, updateUser } = useAuth();
  const [tab,     setTab]     = useState('perfil');
  const [loading, setLoading] = useState(false);
  const [form,    setForm]    = useState({ name: '', studioName: '', phone: '', email: '', profileImage: '' });

  useEffect(() => {
    if (user) {
      const savedImg = localStorage.getItem('profile_image') || user.profileImage || '';
      setForm({ name: user.name || '', studioName: user.studioName || '', phone: user.phone || '', email: user.email || '', profileImage: savedImg });
    }
  }, [user]);

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

  const initials = (form.name || 'F').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();

  const TABS = [['perfil','Perfil'],['notificacoes','Notificações'],['conta','Conta']];
  const cardStyle = { background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, marginBottom: 16 };
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 };

  return (
    <Layout>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.4px' }}>Configurações</h1>
          <p style={{ color: '#555', fontSize: 13, marginTop: 4 }}>Gerencie sua conta e preferências</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 22, background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 4 }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all .15s',
                background: tab === id ? 'linear-gradient(135deg,#E87722,#C85A00)' : 'transparent',
                color: tab === id ? '#fff' : '#555',
                boxShadow: tab === id ? '0 4px 12px rgba(232,119,34,0.3)' : 'none',
              }}>{label}</button>
          ))}
        </div>

        {tab === 'perfil' && (
          <form onSubmit={saveProfile}>
            <div style={cardStyle}>
              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg,#E87722,#C85A00)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '3px solid rgba(232,119,34,0.3)' }}>
                    {form.profileImage
                      ? <img src={form.profileImage} alt="perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: '#fff', fontWeight: 800, fontSize: 24 }}>{initials}</span>
                    }
                  </div>
                  <label htmlFor="photo-input" style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, background: '#E87722', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #0A0A0A' }}>
                    <Camera size={13} color="#fff" />
                    <input id="photo-input" type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                  </label>
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{form.name || 'Fotógrafo'}</div>
                  <div style={{ color: '#E87722', fontSize: 13, marginTop: 3 }}>{form.studioName || 'Sem estúdio definido'}</div>
                  <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>{form.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[['name','Nome completo',User,'text','Seu nome'],['studioName','Nome do estúdio',Camera,'text','Ex: MV Fotografia'],['phone','Telefone / WhatsApp',Phone,'tel','(11) 99999-9999']].map(([k,l,Icon,t,ph]) => (
                  <div key={k}>
                    <label style={labelStyle}>{l}</label>
                    <div style={{ position: 'relative' }}>
                      <Icon size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                      <input className="f-input" type={t} placeholder={ph} value={form[k]}
                        onChange={e => setForm(p => ({...p,[k]:e.target.value}))}
                        style={{ paddingLeft: 38 }} />
                    </div>
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                    <input className="f-input" type="email" value={form.email} disabled style={{ paddingLeft: 38, opacity: 0.5 }} />
                  </div>
                  <p style={{ color: '#444', fontSize: 11, marginTop: 5 }}>Email não pode ser alterado</p>
                </div>
              </div>
            </div>
            <button type="submit" className="f-btn f-btn-primary" disabled={loading} style={{ width: '100%', padding: '13px', fontSize: 15 }}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Salvando...</> : <><Save size={16} /> Salvar Alterações</>}
            </button>
          </form>
        )}

        {tab === 'notificacoes' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, background: 'rgba(232,119,34,0.12)', border: '1px solid rgba(232,119,34,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={20} color="#E87722" />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Notificações Push</div>
                <div style={{ color: '#555', fontSize: 13, marginTop: 2 }}>Receba lembretes de eventos</div>
              </div>
            </div>
            <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ color: '#777', fontSize: 13, lineHeight: 1.6 }}>📱 Alertas no celular e computador<br />⏰ 48h, 24h e 12h antes do evento<br />🔔 Funciona mesmo com o app fechado</p>
            </div>
            <button className="f-btn f-btn-primary" style={{ width: '100%', padding: '12px' }} onClick={async () => {
              if (!('Notification' in window)) { toast.error('Navegador não suporta notificações'); return; }
              const perm = await Notification.requestPermission();
              if (perm === 'granted') toast.success('Notificações ativadas!');
              else toast.error('Permissão negada. Ative nas configurações do navegador.');
            }}>
              <Bell size={16} /> Ativar Notificações
            </button>
          </div>
        )}

        {tab === 'conta' && (
          <div style={cardStyle}>
            <h3 style={{ color: '#ddd', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Plano atual</h3>

            {/* STARTER */}
            {(!user?.subscription?.plan || user?.subscription?.plan === 'starter') && (
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#22C55E', fontWeight: 800, fontSize: 16 }}>Plano Starter</div>
                    <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>Até 20 clientes · Agenda · Financeiro básico</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>R$19,90</div>
                    <div style={{ color: '#555', fontSize: 11 }}>/mês</div>
                  </div>
                </div>
              </div>
            )}

            {/* NORMAL */}
            {user?.subscription?.plan === 'normal' && (
              <div style={{ background: 'rgba(232,119,34,0.08)', border: '1px solid rgba(232,119,34,0.2)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#E87722', fontWeight: 800, fontSize: 16 }}>Plano Normal</div>
                    <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>Clientes ilimitados · IA · GPS · Google Agenda</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>R$39,90</div>
                    <div style={{ color: '#555', fontSize: 11 }}>/mês</div>
                  </div>
                </div>
              </div>
            )}

            {/* PRO */}
            {user?.subscription?.plan === 'pro' && (
              <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#A855F7', fontWeight: 800, fontSize: 16 }}>Plano PRO</div>
                    <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>Tudo do Normal + Galeria + Reconhecimento facial</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>R$69,90</div>
                    <div style={{ color: '#555', fontSize: 11 }}>/mês</div>
                  </div>
                </div>
              </div>
            )}

            {/* Upgrade options */}
            <div style={{ marginTop: 8 }}>
              {user?.subscription?.plan !== 'pro' && (
                <a href="/assinatura" style={{ display: 'block', width: '100%', padding: '11px', background: 'linear-gradient(135deg,#7C3AED,#4C1D95)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', marginBottom: 8 }}>
                  ⬆️ Ver todos os planos
                </a>
              )}
              {user?.subscription?.status === 'active' && (
                <button onClick={async () => {
                  try {
                    const { data } = await api.post('/api/subscription/portal');
                    window.location.href = data.portalUrl;
                  } catch { toast.error('Erro ao abrir portal'); }
                }} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#666', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Gerenciar assinatura (Stripe)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
