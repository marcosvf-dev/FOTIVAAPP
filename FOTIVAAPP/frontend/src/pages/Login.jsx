import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const Camera3D = () => (
  <svg width="110" height="110" viewBox="0 0 110 110" fill="none" className="animate-float">
    <defs>
      <linearGradient id="cg1" x1="0" y1="0" x2="110" y2="110" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF9A3C"/>
        <stop offset="100%" stopColor="#C85A00"/>
      </linearGradient>
      <linearGradient id="cg2" x1="0" y1="0" x2="110" y2="110" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1A1A1A"/>
        <stop offset="100%" stopColor="#0D0D0D"/>
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect x="8" y="28" width="94" height="64" rx="12" fill="url(#cg2)" stroke="rgba(232,119,34,0.3)" strokeWidth="1.5"/>
    <rect x="8" y="30" width="94" height="18" rx="0" fill="rgba(255,255,255,0.03)"/>
    <rect x="38" y="14" width="34" height="18" rx="6" fill="#141414" stroke="rgba(232,119,34,0.25)" strokeWidth="1.2"/>
    <circle cx="55" cy="62" r="22" fill="#0D0D0D" stroke="rgba(232,119,34,0.2)" strokeWidth="1.5"/>
    <circle cx="55" cy="62" r="16" fill="url(#cg1)" filter="url(#glow)" opacity="0.9"/>
    <circle cx="55" cy="62" r="9" fill="#C85A00"/>
    <circle cx="55" cy="62" r="4" fill="#080808"/>
    <circle cx="59" cy="58" r="2" fill="rgba(255,255,255,0.4)"/>
    <circle cx="20" cy="40" r="5" fill="#1C1C1C" stroke="rgba(232,119,34,0.2)" strokeWidth="1"/>
    <circle cx="20" cy="40" r="2.5" fill="rgba(232,119,34,0.6)"/>
    <rect x="80" y="36" width="14" height="8" rx="3" fill="#1C1C1C" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
    <rect x="83" y="39" width="8" height="2" rx="1" fill="#E87722" opacity="0.5"/>
  </svg>
);

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Email ou senha incorretos');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex' }}>
      {/* Left panel - decorative */}
      <div style={{ flex: 1, display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A', borderRight: '1px solid rgba(255,255,255,0.05)', padding: 48, position: 'relative', overflow: 'hidden' }} className="left-panel">
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,119,34,0.08) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        <Camera3D />
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 10 }}>fotiva</div>
          <div style={{ color: '#555', fontSize: 15, lineHeight: 1.6 }}>Seu estúdio na palma da mão.<br/>Gerencie eventos, clientes e finanças.</div>
        </div>
        <div style={{ display: 'flex', gap: 28, marginTop: 48 }}>
          {[['500+','Fotógrafos'],['10k+','Eventos'],['R$2M+','Gerenciados']].map(([v,l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ color: '#E87722', fontWeight: 800, fontSize: 20 }}>{v}</div>
              <div style={{ color: '#444', fontSize: 12, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div style={{ width: '100%', maxWidth: 380 }} className="animate-fadeIn">
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#E87722,#C85A00)', borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 28px rgba(232,119,34,0.4)' }}>
              <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
                <path d="M4 5C4 5 9 3 14 7C14 7 19 11 16 16C16 16 13 20 8 17" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M8 17C8 17 5 20 4 18C3 16 6 14 8 13" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.4px' }}>Bem-vindo de volta</h1>
            <p style={{ color: '#555', fontSize: 14, marginTop: 6 }}>Entre na sua conta FOTIVA</p>
          </div>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="f-label">Email</label>
              <input className="f-input" type="email" placeholder="seu@email.com" required
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="f-label">Senha</label>
              <input className="f-input" type="password" placeholder="••••••••" required
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <button type="submit" className="f-btn f-btn-primary" disabled={loading}
              style={{ marginTop: 8, padding: '13px', fontSize: 15, width: '100%' }}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Entrando...</> : 'Entrar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, color: '#555', fontSize: 14 }}>
            Não tem conta?{' '}
            <Link to="/cadastro" style={{ color: '#E87722', fontWeight: 600 }}>Criar conta grátis</Link>
          </p>
        </div>
      </div>

      <style>{`@media(min-width:768px){.left-panel{display:flex!important}}`}</style>
    </div>
  );
}
