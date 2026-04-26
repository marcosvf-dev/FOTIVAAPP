import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login          from './pages/Login';
import Register       from './pages/Register';
import Dashboard      from './pages/Dashboard';
import Eventos        from './pages/Eventos';
import NovoEvento     from './pages/NovoEvento';
import EditarEvento   from './pages/EditarEvento';
import Clientes       from './pages/Clientes';
import NovoCliente    from './pages/NovoCliente';
import Pagamentos     from './pages/Pagamentos';
import Agenda         from './pages/Agenda';
import Configuracoes  from './pages/Configuracoes';
import Assinatura     from './pages/Assinatura';
import PagamentoRetorno from './pages/PagamentoRetorno';
import Admin          from './pages/Admin';
import Galerias       from './pages/Galerias';
import GaleriaCliente from './pages/GaleriaCliente';

function Private({ children, requireSub = true }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#080808' }}>
      <div style={{ width:20, height:20, border:'2px solid rgba(255,255,255,.2)', borderTopColor:'#E87722', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (requireSub) {
    const s = user.subscription;
    const now = new Date();
    const active = s?.status==='active' || (s?.status==='trial' && new Date(s?.trialEndsAt) > now);
    if (!active) return <Navigate to="/assinatura" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/galeria/:id" element={<GaleriaCliente />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/admin"    element={<Admin />} />
          <Route path="/pagamento/sucesso"  element={<PagamentoRetorno />} />
          <Route path="/pagamento/falha"    element={<PagamentoRetorno />} />
          <Route path="/pagamento/pendente" element={<PagamentoRetorno />} />
          <Route path="/assinatura" element={<Private requireSub={false}><Assinatura /></Private>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"          element={<Private><Dashboard /></Private>} />
          <Route path="/eventos"            element={<Private><Eventos /></Private>} />
          <Route path="/eventos/novo"       element={<Private><NovoEvento /></Private>} />
          <Route path="/eventos/editar/:id" element={<Private><EditarEvento /></Private>} />
          <Route path="/clientes"           element={<Private><Clientes /></Private>} />
          <Route path="/clientes/novo"       element={<Private><NovoCliente /></Private>} />
          <Route path="/agenda"             element={<Private><Agenda /></Private>} />
          <Route path="/pagamentos"         element={<Private><Pagamentos /></Private>} />
          <Route path="/configuracoes"      element={<Private><Configuracoes /></Private>} />
          <Route path="/galerias"            element={<Private><Galerias /></Private>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster position="top-right" toastOptions={{ style:{ background:'#1C1C1C', border:'1px solid rgba(255,255,255,.08)', color:'#fff' } }}/>
      </BrowserRouter>
    </AuthProvider>
  );
}
