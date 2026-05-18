import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, CalendarDays, Calendar, Users,
  DollarSign, Image, Settings, LogOut, Menu, X, Megaphone, Calculator, Camera
} from 'lucide-react';
import Assistente from './Assistente';

const LOGO_SRC = "/logo-fotiva.png";

const nav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agenda',       icon: CalendarDays,    label: 'Agenda' },
  { to: '/eventos',      icon: Calendar,        label: 'Eventos' },
  { to: '/clientes',     icon: Users,           label: 'Clientes' },
  { to: '/pagamentos',   icon: DollarSign,      label: 'Pagamentos' },
  { to: '/galerias',     icon: Image,           label: 'Galerias PRO' },
  { to: '/parceiros',    icon: Megaphone,       label: 'Parceiros' },
  { to: '/calculadora',  icon: Calculator,      label: 'Calculadora' },
  { to: '/equipamentos', icon: Camera,          label: 'Equipamentos' },
  { to: '/configuracoes',icon: Settings,        label: 'Configurações' },
];

const sidebarBase = {
  position: 'fixed', top: 0, left: 0, height: '100%', width: 220,
  background: '#0A0A0A', borderRight: '1px solid rgba(255,255,255,0.06)',
  display: 'flex', flexDirection: 'column', zIndex: 50,
  transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const profileImage = localStorage.getItem('profile_image') || user?.profileImage;
  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Mobile overlay */}
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 49, backdropFilter: 'blur(4px)' }} />
      )}

      {/* Sidebar (JSX inline — não é função, não remonta a cada render) */}
      <aside
        className="fotiva-sidebar"
        style={{
          ...sidebarBase,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}>
        {/* Logo Fotiva */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#060606', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', minHeight: 72 }}>
          <img src={LOGO_SRC} alt="Fotiva" style={{ width: '100%', maxWidth: 200, objectFit: 'contain' }}/>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                fontSize: 13, fontWeight: 500, transition: 'all .15s',
                background: isActive ? 'linear-gradient(135deg,#E87722,#C85A00)' : 'transparent',
                color: isActive ? '#fff' : '#666',
                boxShadow: isActive ? '0 4px 14px rgba(232,119,34,0.3)' : 'none',
                textDecoration: 'none',
              })}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '10px 8px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#141414', borderRadius: 10, marginBottom: 6 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#E87722,#C85A00)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {profileImage
                ? <img src={profileImage} alt="perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{initials}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#ddd', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ color: '#E87722', fontSize: 10, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.studioName || 'Fotógrafo'}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'none', border: 'none', color: '#555', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'none'; }}
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, marginLeft: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '100vw' }}
        className="lg-ml-220">
        {/* Mobile topbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#0A0A0A', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 30 }}
          className="mobile-topbar">
          <button onClick={() => setOpen(true)}
            style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 7, color: '#888', cursor: 'pointer', display: 'flex' }}>
            <Menu size={18} />
          </button>
          <img src={LOGO_SRC} alt="Fotiva" style={{ height: 24, objectFit: 'contain' }}/>
        </div>

        <main style={{ flex: 1, padding: '20px 16px', maxWidth: 1200, width: '100%', margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden' }}>
          <div className="animate-fadeIn">{children}</div>
        </main>
      </div>

      <Assistente />

      <style>{`
        @media(min-width:1024px){
          .mobile-topbar{display:none!important}
          .lg-ml-220{margin-left:220px!important}
          .fotiva-sidebar{transform:translateX(0)!important}
        }
        * { box-sizing: border-box; }
        img, video { max-width: 100%; }
      `}</style>
    </div>
  );
}
