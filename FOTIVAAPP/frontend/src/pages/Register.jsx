import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', studioName: '' });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Senha mínima de 6 caracteres'); return; }
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar conta');
    } finally { setLoading(false); }
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="f-label">{label}</label>
      <input className="f-input" type={type} placeholder={placeholder} required={key !== 'studioName'}
        value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <div style={{ width: '100%', maxWidth: 400 }} className="animate-fadeIn">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#E87722,#C85A00)', borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 8px 28px rgba(232,119,34,0.4)' }}>
            <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
              <path d="M4 5C4 5 9 3 14 7C14 7 19 11 16 16C16 16 13 20 8 17" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M8 17C8 17 5 20 4 18C3 16 6 14 8 13" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>Criar sua conta</h1>
          <p style={{ color: '#555', fontSize: 13, marginTop: 6 }}>Comece a usar o FOTIVA agora</p>
        </div>

        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {field('name', 'Nome completo', 'text', 'Marcos Vinicius')}
          {field('studioName', 'Nome do estúdio (opcional)', 'text', 'MV Fotografia')}
          {field('email', 'Email', 'email', 'seu@email.com')}
          {field('password', 'Senha', 'password', 'Mínimo 6 caracteres')}
          <button type="submit" className="f-btn f-btn-primary" disabled={loading}
            style={{ marginTop: 8, padding: '13px', fontSize: 15, width: '100%' }}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Criando...</> : 'Criar conta grátis'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 22, color: '#555', fontSize: 14 }}>
          Já tem conta?{' '}
          <Link to="/login" style={{ color: '#E87722', fontWeight: 600 }}>Entrar</Link>
        </p>
      </div>
    </div>
  );
}
