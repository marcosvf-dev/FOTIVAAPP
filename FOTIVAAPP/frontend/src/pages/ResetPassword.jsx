import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../lib/api';

export default function ResetPassword() {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const token           = searchParams.get('token');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (!token) { toast.error('Token inválido ou expirado.'); return; }
    if (form.password.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres.'); return; }
    if (form.password !== form.confirm) { toast.error('As senhas não conferem.'); return; }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, newPassword: form.password });
      setDone(true);
      toast.success('Senha redefinida com sucesso!');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Token inválido ou expirado.');
    } finally { setLoading(false); }
  };

  const inpStyle = { width:'100%', background:'#1a1a1a', border:'1px solid rgba(255,255,255,.08)', borderRadius:9, padding:'11px 14px', color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit' };
  const lblStyle = { display:'block', color:'#666', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 };

  return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', padding:20 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.07)', borderRadius:20, padding:32 }}>
          {done ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
              <h2 style={{ color:'#fff', fontSize:20, fontWeight:800, marginBottom:8 }}>Senha redefinida!</h2>
              <p style={{ color:'#555', fontSize:14 }}>Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              <div style={{ textAlign:'center', marginBottom:28 }}>
                <h1 style={{ color:'#fff', fontSize:22, fontWeight:800, letterSpacing:-.5, marginBottom:6 }}>Nova senha</h1>
                <p style={{ color:'#555', fontSize:14 }}>Digite sua nova senha para continuar</p>
              </div>
              {!token && (
                <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'12px 16px', marginBottom:20, color:'#EF4444', fontSize:13, textAlign:'center' }}>
                  ❌ Link inválido ou expirado. Solicite um novo.
                </div>
              )}
              <form onSubmit={handle}>
                <div style={{ marginBottom:16 }}>
                  <label style={lblStyle}>Nova senha</label>
                  <input type="password" placeholder="Mínimo 6 caracteres" value={form.password}
                    onChange={e => setForm(f => ({...f, password: e.target.value}))} style={inpStyle}/>
                </div>
                <div style={{ marginBottom:24 }}>
                  <label style={lblStyle}>Confirmar nova senha</label>
                  <input type="password" placeholder="Repita a senha" value={form.confirm}
                    onChange={e => setForm(f => ({...f, confirm: e.target.value}))} style={inpStyle}/>
                </div>
                <button type="submit" disabled={loading || !token}
                  style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#E87722,#C85A00)', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:(loading||!token)?'not-allowed':'pointer', fontFamily:'inherit', opacity:(loading||!token)?.6:1 }}>
                  {loading ? 'Redefinindo...' : '🔐 Redefinir senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
