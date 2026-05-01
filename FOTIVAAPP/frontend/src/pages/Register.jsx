import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const ICONE_SRC = "data:image/jpeg;base64,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";
// ⚠️ Mantenha a sua LOGO_SRC original aqui — não apague
const LOGO_SRC = "COLE_AQUI_SUA_LOGO_SRC_ORIGINAL";

const PLANS = [
  { id:'starter', name:'Starter', price:'R$19,90/mês', desc:'Para fotógrafos iniciantes', color:'#22C55E', colorBg:'rgba(34,197,94,.08)', colorBorder:'rgba(34,197,94,.25)', features:['Até 20 clientes','Agenda e eventos','Financeiro básico'], trial:'7 dias grátis' },
  { id:'normal',  name:'Normal',  price:'R$39,90/mês', desc:'Para fotógrafos profissionais', color:'#E87722', colorBg:'rgba(232,119,34,.08)', colorBorder:'rgba(232,119,34,.3)', features:['Clientes ilimitados','IA com Gemini','GPS (Maps/Waze)'], popular:true },
  { id:'pro',     name:'PRO',     price:'R$69,90/mês', desc:'Para estúdios e esportes', color:'#A855F7', colorBg:'rgba(168,85,247,.08)', colorBorder:'rgba(168,85,247,.25)', features:['Tudo do Normal','Galeria de fotos','Reconhecimento facial'] },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step,             setStep]            = useState(1);
  const [form,             setForm]            = useState({ name:'', email:'', password:'', studioName:'' });
  const [plan,             setPlan]            = useState('starter');
  const [loading,          setLoading]         = useState(false);
  const [consentAccepted,  setConsentAccepted] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const chosenPlan = PLANS.find(p => p.id === plan);

  const goToPlans = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.studioName)
      return toast.error('Preencha todos os campos');
    if (form.password.length < 6) return toast.error('Senha mínima de 6 caracteres');
    if (!consentAccepted) return toast.error('Você precisa aceitar os Termos de Uso para continuar.');
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await register({ ...form, selectedPlan: plan, consentAcceptedAt: new Date().toISOString() });
      if (plan !== 'starter') navigate('/assinatura');
      else navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar conta');
    } finally { setLoading(false); }
  };

  const inpStyle = { width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:9, padding:'11px 14px', color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit' };

  return (
    <div style={{ minHeight:'100vh', background:'#080810', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:'Inter,sans-serif' }}>
      <div style={{ width:'100%', maxWidth: step===2 ? 820 : 420, background:'#0d0d14', border:'1px solid rgba(255,255,255,.08)', borderRadius:20, padding:'36px 32px' }}>

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img src={LOGO_SRC} alt="Fotiva" style={{ height:36, objectFit:'contain', marginBottom:16 }}/>
          <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, margin:'0 0 6px' }}>
            {step === 1 ? 'Criar conta gratuita' : 'Escolha seu plano'}
          </h1>
          <p style={{ color:'#555', fontSize:13 }}>
            {step === 1 ? 'Comece agora mesmo' : 'Você pode trocar de plano a qualquer momento'}
          </p>
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:14 }}>
            {[1,2].map(s => (
              <div key={s} style={{ width: s===step ? 24 : 8, height:8, borderRadius:4, background: s<=step ? '#E87722' : 'rgba(255,255,255,.1)', transition:'all .3s' }}/>
            ))}
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={goToPlans}>
            {[
              ['name',       'Seu nome',        'text',     'João Silva'],
              ['studioName', 'Nome do estúdio', 'text',     'JS Fotografia'],
              ['email',      'Email',            'email',    'joao@email.com'],
              ['password',   'Senha',            'password', 'Mínimo 6 caracteres'],
            ].map(([key, label, type, ph]) => (
              <div key={key} style={{ marginBottom:14 }}>
                <label style={{ display:'block', color:'#666', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:5 }}>{label}</label>
                <input type={type} placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} style={inpStyle}/>
              </div>
            ))}

            {/* ── Checkbox de consentimento LGPD ── */}
            <label style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer', padding:'14px', marginBottom:16, background: consentAccepted ? 'rgba(232,119,34,0.08)' : '#1a1a1a', borderRadius:10, border:`1px solid ${consentAccepted ? '#E87722' : '#333'}` }}>
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={e => setConsentAccepted(e.target.checked)}
                style={{ width:18, height:18, marginTop:2, accentColor:'#E87722', flexShrink:0 }}
              />
              <span style={{ fontSize:13, color:'#ccc', lineHeight:1.6 }}>
                Li e concordo com os{' '}
                <a href="/termos" target="_blank" rel="noreferrer" style={{ color:'#E87722', textDecoration:'underline' }} onClick={e => e.stopPropagation()}>Termos de Uso</a>
                {' '}e a{' '}
                <a href="/termos" target="_blank" rel="noreferrer" style={{ color:'#E87722', textDecoration:'underline' }} onClick={e => e.stopPropagation()}>Política de Privacidade</a>
                , incluindo o tratamento dos meus dados conforme a LGPD.
              </span>
            </label>

            <button type="submit" disabled={!consentAccepted}
              style={{ width:'100%', padding:'13px', borderRadius:10, background: consentAccepted ? 'linear-gradient(135deg,#E87722,#C85A00)' : '#333', color: consentAccepted ? '#fff' : '#666', border:'none', fontSize:15, fontWeight:700, cursor: consentAccepted ? 'pointer' : 'not-allowed', fontFamily:'inherit', marginTop:6, transition:'all .2s' }}>
              Continuar →
            </button>
            <p style={{ textAlign:'center', color:'#555', fontSize:13, marginTop:16 }}>
              Já tem conta? <Link to="/login" style={{ color:'#E87722', textDecoration:'none' }}>Entrar</Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
              {PLANS.map(p => (
                <div key={p.id} onClick={() => setPlan(p.id)}
                  style={{ background: plan===p.id ? p.colorBg : 'rgba(255,255,255,.02)', border:`2px solid ${plan===p.id ? p.color : 'rgba(255,255,255,.08)'}`, borderRadius:16, padding:18, cursor:'pointer', transition:'all .2s', position:'relative' }}>
                  {p.popular && <div style={{ position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 12px', borderRadius:12, whiteSpace:'nowrap' }}>⭐ Popular</div>}
                  {p.trial   && <div style={{ position:'absolute', top:-11, right:10, background:'rgba(34,197,94,.15)', color:'#22C55E', border:'1px solid rgba(34,197,94,.3)', fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:12, whiteSpace:'nowrap' }}>{p.trial}</div>}
                  <div style={{ fontSize:13, fontWeight:800, color: plan===p.id ? p.color : '#888', marginBottom:2 }}>{p.name}</div>
                  <div style={{ fontSize:18, fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:6 }}>
                    {p.price.split('/')[0]}<span style={{ fontSize:11, color:'#555', fontWeight:400 }}>/{p.price.split('/')[1]}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#555', marginBottom:10 }}>{p.desc}</div>
                  {p.features.map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#888', marginBottom:4 }}>
                      <div style={{ width:13, height:13, borderRadius:'50%', background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, color:'#22C55E', flexShrink:0 }}>✓</div>
                      {f}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {plan === 'starter' ? (
              <div style={{ background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.15)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#22C55E' }}>
                🎉 <strong>7 dias grátis</strong> — sem cartão de crédito! Cancele quando quiser.
              </div>
            ) : (
              <div style={{ background:'rgba(232,119,34,.06)', border:'1px solid rgba(232,119,34,.15)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#E87722' }}>
                💳 Após criar a conta, você será redirecionado para o pagamento seguro via Stripe.
              </div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setStep(1)}
                style={{ flex:1, padding:'12px', borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'#888', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                ← Voltar
              </button>
              <button onClick={handleSubmit} disabled={loading}
                style={{ flex:2, padding:'12px', borderRadius:10, background: plan==='starter' ? 'linear-gradient(135deg,#22C55E,#16A34A)' : plan==='pro' ? 'linear-gradient(135deg,#7C3AED,#4C1D95)' : 'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:loading?.6:1 }}>
                {loading ? 'Criando conta...' : plan==='starter' ? '🚀 Criar conta grátis' : `💳 Criar conta e assinar ${chosenPlan?.name}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
