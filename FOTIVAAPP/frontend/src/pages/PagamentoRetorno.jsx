import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function PagamentoRetorno() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const [status, setStatus] = useState('loading');

  const sessionId = params.get('session_id');
  const plan      = params.get('plan') || 'normal';
  const urlPath   = window.location.pathname;

  useEffect(() => {
    if (urlPath.includes('sucesso') && sessionId) {
      setStatus('success');
      setTimeout(() => { window.location.href = '/dashboard'; }, 4000);
    } else if (urlPath.includes('pendente')) {
      setStatus('pending');
    } else {
      setStatus('failure');
    }
  }, []);

  const configs = {
    loading: { icon: null, color:'#888', title:'Verificando...', sub:'' },
    success: {
      icon: <CheckCircle size={56} color="#22C55E"/>, color:'#22C55E',
      title:'Pagamento aprovado!',
      sub: `Seu plano ${plan.toUpperCase()} está ativo. Redirecionando para o dashboard...`,
    },
    pending: {
      icon: <Clock size={56} color="#E87722"/>, color:'#E87722',
      title:'Pagamento em análise',
      sub: 'Assim que confirmado pelo Stripe, seu acesso será liberado automaticamente.',
    },
    failure: {
      icon: <XCircle size={56} color="#EF4444"/>, color:'#EF4444',
      title:'Pagamento não concluído',
      sub: 'Você pode tentar novamente com outro cartão.',
    },
  };

  const c = configs[status];

  return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', padding:20 }}>
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.07)', borderRadius:24, padding:'48px 40px', maxWidth:440, width:'100%', textAlign:'center' }}>
        {c.icon && <div style={{ marginBottom:20 }}>{c.icon}</div>}
        <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', letterSpacing:-.5, marginBottom:10 }}>{c.title}</h1>
        <p style={{ color:'#666', fontSize:14, lineHeight:1.7, marginBottom:28 }}>{c.sub}</p>

        {status === 'success' && (
          <div style={{ background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:12, padding:'12px 16px', marginBottom:24 }}>
            <p style={{ color:'#22C55E', fontSize:13 }}>✅ Plano {plan.toUpperCase()} ativado com sucesso!</p>
          </div>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
          {status === 'failure' && (
            <button onClick={() => navigate('/assinatura')}
              style={{ padding:'10px 24px', borderRadius:9, background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Tentar novamente
            </button>
          )}
          <button onClick={() => navigate('/dashboard')}
            style={{ padding:'10px 24px', borderRadius:9, background:'transparent', color:'#888', border:'1px solid rgba(255,255,255,.1)', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
            Ir para o Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
