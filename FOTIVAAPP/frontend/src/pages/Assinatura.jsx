import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Tag, Check, X, CreditCard, ExternalLink } from 'lucide-react';

const PLANS = [
  {
    id: 'normal', name: 'Normal', price: 29.90,
    desc: 'Para fotógrafos que estão começando',
    features: ['Dashboard completo','Agenda e calendário','Clientes ilimitados',
      'Controle financeiro','Assistente com IA','Notificações push'],
    popular: false,
  },
  {
    id: 'pro', name: 'PRO', price: 39.90, popular: true,
    desc: 'Para fotógrafos profissionais',
    features: ['Tudo do Normal','Galeria de fotos','Link exclusivo por cliente',
      'Reconhecimento facial (em breve)','Suporte prioritário'],
  },
];

const inp = (extra={}) => ({
  width:'100%', background:'#1a1a1a',
  border:'1px solid rgba(255,255,255,.08)',
  borderRadius:9, padding:'10px 14px', color:'#fff',
  fontSize:14, outline:'none', fontFamily:'inherit', ...extra,
});

export default function Assinatura() {
  const navigate = useNavigate();
  const [loading,       setLoading]       = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [status,        setStatus]        = useState(null);
  const [couponCode,    setCouponCode]    = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponData,    setCouponData]    = useState(null);
  const [couponError,   setCouponError]   = useState('');

  useEffect(() => {
    api.get('/api/subscription/status').then(r => setStatus(r.data)).catch(() => {});
  }, []);

  const validateCoupon = async (plan = 'normal') => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError(''); setCouponData(null);
    try {
      const { data } = await api.post('/api/coupons/validate', { code: couponCode.trim(), plan });
      setCouponData(data);
      toast.success('Cupom aplicado! ' + data.label);
    } catch (e) {
      setCouponError(e.response?.data?.error || 'Cupom inválido');
    }
    setCouponLoading(false);
  };

  const clearCoupon = () => { setCouponCode(''); setCouponData(null); setCouponError(''); };

  const subscribe = async (plan) => {
    setLoading(plan);
    if (couponCode.trim() && !couponData) await validateCoupon(plan);
    try {
      const { data } = await api.post('/api/subscription/create', {
        plan,
        couponCode: couponData ? couponCode.trim() : undefined,
      });
      window.location.href = data.checkoutUrl;
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao criar checkout');
      setLoading(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await api.post('/api/subscription/portal');
      window.location.href = data.portalUrl;
    } catch (e) {
      toast.error('Erro ao abrir portal');
      setPortalLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#080808', padding:'40px 20px', fontFamily:'Inter,sans-serif' }}>
      <div style={{ maxWidth:820, margin:'0 auto' }}>

        <button onClick={() => navigate(-1)} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, color:'#888', padding:'8px 14px', cursor:'pointer', marginBottom:32, fontSize:13, fontFamily:'inherit' }}>
          <ArrowLeft size={15}/> Voltar
        </button>

        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontSize:32, fontWeight:800, color:'#fff', letterSpacing:-1, marginBottom:10 }}>Escolha seu plano</h1>
          <p style={{ color:'#666', fontSize:15 }}>7 dias grátis · Cobrado mensalmente · Cancele quando quiser</p>

          {status?.status === 'trial' && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:14, background:'rgba(232,119,34,.1)', border:'1px solid rgba(232,119,34,.25)', borderRadius:10, padding:'8px 16px' }}>
              <Clock size={14} color="#E87722"/>
              <span style={{ color:'#E87722', fontSize:13, fontWeight:600 }}>
                Trial: {status.trialDaysLeft} dia{status.trialDaysLeft!==1?'s':''} restante{status.trialDaysLeft!==1?'s':''}
              </span>
            </div>
          )}

          {status?.status === 'active' && (
            <div style={{ marginTop:16 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:10, padding:'8px 16px', marginBottom:12 }}>
                <Check size={14} color="#22C55E"/>
                <span style={{ color:'#22C55E', fontSize:13, fontWeight:600 }}>
                  Plano {status.plan?.toUpperCase()} ativo
                </span>
              </div>
              <div>
                <button onClick={openPortal} disabled={portalLoading}
                  style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:9, padding:'9px 18px', color:'#ccc', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                  <ExternalLink size={14}/>
                  {portalLoading ? 'Abrindo...' : 'Gerenciar assinatura (Stripe)'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CUPOM */}
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:20, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <Tag size={15} color="#E87722"/>
            <span style={{ color:'#ddd', fontSize:14, fontWeight:600 }}>Tem um cupom de desconto?</span>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ position:'relative', flex:1 }}>
              <input
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponData(null); setCouponError(''); }}
                onKeyDown={e => e.key==='Enter' && validateCoupon()}
                placeholder="Ex: FOTIVA50"
                style={inp({ border:`1px solid ${couponData?'rgba(34,197,94,.4)':couponError?'rgba(239,68,68,.4)':'rgba(255,255,255,.08)'}`, letterSpacing:1, textTransform:'uppercase' })}
              />
              {couponData && <button onClick={clearCoupon} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#555' }}><X size={15}/></button>}
            </div>
            <button onClick={() => validateCoupon()} disabled={!couponCode.trim()||couponLoading}
              style={{ padding:'10px 18px', borderRadius:9, background:'rgba(232,119,34,.15)', border:'1px solid rgba(232,119,34,.3)', color:'#E87722', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:!couponCode.trim()||couponLoading?.5:1 }}>
              {couponLoading ? '...' : 'Aplicar'}
            </button>
          </div>
          {couponData && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10, background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:9, padding:'8px 12px' }}>
              <Check size={14} color="#22C55E"/>
              <span style={{ color:'#22C55E', fontSize:13, fontWeight:600 }}>{couponData.label} — de R${couponData.originalPrice?.toFixed(2)} por R${couponData.finalPrice?.toFixed(2)}/mês</span>
            </div>
          )}
          {couponError && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:9, padding:'8px 12px' }}>
              <X size={14} color="#EF4444"/>
              <span style={{ color:'#EF4444', fontSize:13 }}>{couponError}</span>
            </div>
          )}
        </div>

        {/* PLANOS */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:36 }}>
          {PLANS.map(p => {
            const finalPrice   = couponData?.finalPrice;
            const hasDiscount  = finalPrice && finalPrice < p.price;
            return (
              <div key={p.id} style={{ background:'#111', border:p.popular?'2px solid #E87722':'1px solid rgba(255,255,255,.07)', borderRadius:20, padding:28, position:'relative' }}>
                {p.popular && (
                  <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', fontSize:11, fontWeight:700, padding:'3px 16px', borderRadius:20, whiteSpace:'nowrap' }}>
                    Mais popular
                  </div>
                )}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#666', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>{p.name}</div>
                  {hasDiscount ? (
                    <div>
                      <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                        <span style={{ fontSize:36, fontWeight:800, color:'#fff', letterSpacing:-1 }}>R${finalPrice.toFixed(2)}</span>
                        <span style={{ color:'#555', fontSize:13 }}>/mês</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                        <span style={{ color:'#555', fontSize:13, textDecoration:'line-through' }}>R${p.price.toFixed(2)}</span>
                        <span style={{ background:'rgba(34,197,94,.12)', color:'#22C55E', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>{couponData.label}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                      <span style={{ fontSize:36, fontWeight:800, color:'#fff', letterSpacing:-1 }}>R${p.price.toFixed(2)}</span>
                      <span style={{ color:'#555', fontSize:13 }}>/mês</span>
                    </div>
                  )}
                  <p style={{ color:'#666', fontSize:13, marginTop:6 }}>{p.desc}</p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:22 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:9, fontSize:13, color:'#C8C8C8' }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:8, color:'#22C55E' }}>✓</div>
                      {f}
                    </div>
                  ))}
                </div>
                <button onClick={() => subscribe(p.id)} disabled={!!loading}
                  style={{ width:'100%', padding:12, borderRadius:10, fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', opacity:loading?.6:1, transition:'all .15s', background:p.popular?'linear-gradient(135deg,#E87722,#C85A00)':'transparent', border:p.popular?'none':'1px solid rgba(255,255,255,.12)', color:p.popular?'#fff':'#C8C8C8' }}>
                  {loading===p.id ? 'Redirecionando...' : `Assinar ${p.name}${hasDiscount?' — R$'+finalPrice.toFixed(2):''}`}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign:'center', color:'#555', fontSize:13 }}>
          <div style={{ display:'flex', justifyContent:'center', gap:8, alignItems:'center', marginBottom:10 }}>
            <CreditCard size={14}/>
            <span>Pagamento processado com segurança pelo <strong style={{ color:'#888' }}>Stripe</strong></span>
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:24, flexWrap:'wrap' }}>
            {['🔒 SSL/TLS criptografado','💳 Cartão de crédito/débito','↩️ Cancele quando quiser'].map(t=><span key={t}>{t}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
