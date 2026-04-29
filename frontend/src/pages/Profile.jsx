// src/pages/Profile.jsx
import { useEffect, useState } from 'react';
import { User, Mail, Calendar, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { portfolioApi } from '../services/api';
import { Spinner } from '../components/Loading.jsx';
import { fmtUSD, fmtPct, pctClass } from '../components/format.js';

export default function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([portfolioApi.stats(), portfolioApi.get()])
      .then(([s, pf]) => { setStats(s); setPortfolio(pf); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold">Profil</h1>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-green to-emerald-700 grid place-items-center text-ink-900 font-display text-2xl font-bold">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">{user?.username}</h2>
            <div className="text-white/60 text-sm flex items-center gap-1.5"><Mail size={12} />{user?.email}</div>
            {user?.role === 'admin' && <span className="pill-gold mt-1">ADMIN</span>}
          </div>
        </div>

        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <Info icon={Calendar} label="Üyelik" value={new Date(user?.createdAt || Date.now()).toLocaleDateString('tr-TR')} />
          <Info icon={Wallet}   label="Nakit Bakiye" value={fmtUSD(portfolio?.cashBalance)} />
          <Info icon={User}     label="Rol" value={user?.role || 'trader'} />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">İstatistikler</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Toplam İşlem" value={stats?.totalTrades ?? 0} />
          <Stat label="Alış / Satış" value={`${stats?.buyCount ?? 0} / ${stats?.sellCount ?? 0}`} />
          <Stat label="Toplam Hacim" value={fmtUSD(stats?.totalVolume ?? 0)} />
          <Stat label="P&L %" value={fmtPct(portfolio?.totalPnlPct)} className={pctClass(portfolio?.totalPnlPct)} />
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="bg-white/5 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wider text-white/40 font-mono mb-1 flex items-center gap-1.5">
        <Icon size={11} /> {label}
      </div>
      <div className="font-mono">{value}</div>
    </div>
  );
}

function Stat({ label, value, className = '' }) {
  return (
    <div className="bg-white/5 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wider text-white/40 font-mono mb-1">{label}</div>
      <div className={`font-mono text-lg font-semibold ${className || 'text-white'}`}>{value}</div>
    </div>
  );
}
