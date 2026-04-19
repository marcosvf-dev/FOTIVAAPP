import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, CalendarDays, Calendar, Users,
  DollarSign, Image, Settings, LogOut, Menu, X, Megaphone
} from 'lucide-react';
import Assistente from './Assistente';

const FotivaIcon = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="11" fill="url(#gi)"/>
    <path d="M9 11C9 11 17 8 24 14C24 14 31 20 27 27C27 27 23 33 15 29"
      stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <path d="M15 29C15 29 10 33 9 30C8 27 12 25 14.5 23.5"
      stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <defs>
      <linearGradient id="gi" x1="0" y1="0" x2="40" y2="40">
        <stop offset="0%" stopColor="#FF9A3C"/>
        <stop offset="100%" stopColor="#C85A00"/>
      </linearGradient>
    </defs>
  </svg>
);

const nav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agenda',       icon: CalendarDays,    label: 'Agenda' },
  { to: '/eventos',      icon: Calendar,        label: 'Eventos' },
  { to: '/clientes',     icon: Users,           label: 'Clientes' },
  { to: '/pagamentos',   icon: DollarSign,      label: 'Pagamentos' },
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

  const Sidebar = () => (
    <aside style={{ ...sidebarBase, transform: open || window.innerWidth >= 1024 ? 'translateX(0)' : 'translateX(-100%)' }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#060606' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FotivaIcon size={38} />
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, letterSpacing: '-0.4px', lineHeight: 1.1 }}>fotiva</div>
            <div style={{ color: '#555', fontSize: 10, marginTop: 2 }}>Seu estúdio na palma da mão</div>
          </div>
        </div>
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
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Mobile overlay */}
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 49, backdropFilter: 'blur(4px)' }} />
      )}

      <Sidebar />

      {/* Main */}
      <div style={{ flex: 1, marginLeft: 0, display: 'flex', flexDirection: 'column' }}
        className="lg-ml-220">
        {/* Mobile topbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#0A0A0A', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 30 }}
          className="mobile-topbar">
          <button onClick={() => setOpen(true)}
            style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 7, color: '#888', cursor: 'pointer', display: 'flex' }}>
            <Menu size={18} />
          </button>
          <FotivaIcon size={28} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>fotiva</span>
        </div>

        <main style={{ flex: 1, padding: '28px 28px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
          <div className="animate-fadeIn">{children}</div>
        </main>
      </div>

      <Assistente />

      <style>{`
        @media(min-width:1024px){
          .mobile-topbar{display:none!important}
          .lg-ml-220{margin-left:220px!important}
          aside{transform:translateX(0)!important}
        }
        @media(max-width:1023px){
          aside{transform:translateX(-100%)}
        }
      `}</style>
    </div>
  );
}
