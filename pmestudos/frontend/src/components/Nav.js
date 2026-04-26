import { useState } from 'react';
import { Logo } from './UI';
import { useAuth } from '../context/AuthContext';

// ── SIDEBAR MENU ──────────────────────────────────────────────────
const MENU = [
  { group: 'Principal', items: [
    { icon:'🏠', label:'Dashboard',  page:'dashboard' },
    { icon:'📅', label:'Calendário', page:'calendar' },
    { icon:'❓', label:'Questões',   page:'questions' },
    { icon:'📚', label:'Biblioteca', page:'library' },
  ]},
  { group: 'Desempenho', items: [
    { icon:'📊', label:'Estatísticas', page:'stats' },
    { icon:'📝', label:'Simulados',    page:'simulados' },
    { icon:'🎯', label:'Metas',        page:'goals' },
  ]},
  { group: 'Conta', items: [
    { icon:'⚙️', label:'Configurações', page:'settings' },
  ]},
];

const ADMIN_MENU = [
  { group: 'Administração', items: [
    { icon:'🛡️', label:'Painel Admin', page:'admin' },
  ]},
];

export function Sidebar({ current, onNav, unread }) {
  const { user, logout } = useAuth();
  const allMenu = user?.role === 'admin' ? [...MENU, ...ADMIN_MENU] : MENU;

  return (
    <div className="sidebar">
      <div className="sidebar-user">
        <div className="sidebar-avatar">🪖</div>
        <div>
          <div className="sidebar-name">{user?.name?.split(' ')[0] || 'Usuário'}</div>
          <div className="sidebar-plan">
            {user?.plan === 'pro' ? '⭐ Pro' : user?.plan === 'elite' ? '💎 Elite' : '🆓 Grátis'}
          </div>
        </div>
      </div>

      {allMenu.map(g => (
        <div key={g.group} className="sidebar-section">
          <div className="sidebar-label">{g.group}</div>
          {g.items.map(item => (
            <button
              key={item.page}
              className={`sidebar-btn${current === item.page ? ' active' : ''}`}
              onClick={() => onNav(item.page)}
            >
              <span className="s-icon">{item.icon}</span>
              {item.label}
              {item.page === 'questions' && unread > 0 && <span className="s-badge">{unread}</span>}
            </button>
          ))}
        </div>
      ))}

      <div className="sidebar-footer">
        <button className="sidebar-btn" onClick={logout}>
          <span className="s-icon">🚪</span>Sair
        </button>
      </div>
    </div>
  );
}

// ── NAVBAR ────────────────────────────────────────────────────────
export function Navbar({ onLogoClick, onNav, isApp, notifCount }) {
  const { user } = useAuth();
  return (
    <nav className="nav">
      <Logo onClick={onLogoClick} />
      {isApp ? (
        <div className="nav-actions">
          <button className="nav-icon-btn" onClick={() => onNav && onNav('notifications')} title="Notificações">
            🔔
            {notifCount > 0 && <span className="nav-badge">{notifCount}</span>}
          </button>
          <div className="nav-user">
            <div style={{ fontSize:18 }}>🪖</div>
            <div>
              <div className="nav-user-name">{user?.name?.split(' ')[0]}</div>
              <div className="nav-user-plan">{user?.plan === 'pro' ? '⭐ Pro' : user?.plan === 'elite' ? '💎 Elite' : 'Grátis'}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="nav-actions">
          <button className="nav-link-btn" onClick={() => onNav('features')}>Recursos</button>
          <button className="nav-link-btn" onClick={() => onNav('plans')}>Planos</button>
          <button className="nav-link-btn" onClick={() => onNav('login')}>Entrar</button>
          <button className="nav-cta" onClick={() => onNav('register')}>Começar Grátis</button>
        </div>
      )}
    </nav>
  );
}
