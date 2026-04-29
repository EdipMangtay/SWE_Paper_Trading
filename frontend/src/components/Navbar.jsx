// src/components/Navbar.jsx
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { TrendingUp, LogOut, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  const navItems = [
    { to: '/market',      label: 'Market' },
    ...(user ? [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/portfolio', label: 'Portföy' },
      { to: '/orders',    label: 'Emirler' },
    ] : []),
    { to: '/leaderboard', label: 'Liderlik' }
  ];

  return (
    <header className="sticky top-0 z-30 backdrop-blur-lg bg-ink-900/70 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-green to-emerald-700 grid place-items-center shadow-glow group-hover:scale-105 transition">
            <TrendingUp size={18} className="text-ink-900" strokeWidth={2.5} />
          </div>
          <div className="font-display font-bold tracking-tight">
            <span className="text-white">Paper</span>
            <span className="text-accent-green">Trade</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {user.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `hidden sm:inline-flex pill ${isActive ? 'pill-gold' : 'pill-mute'}`
                  }
                >
                  <ShieldCheck size={12} className="mr-1" /> Admin
                </NavLink>
              )}
              <NavLink to="/profile" className="btn-ghost text-sm">
                <User size={16} className="mr-1.5" />
                <span className="hidden sm:inline">{user.username}</span>
              </NavLink>
              <button onClick={handleLogout} className="btn-ghost text-sm" title="Çıkış">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">Giriş</Link>
              <Link to="/register" className="btn-primary text-sm">Kayıt Ol</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
