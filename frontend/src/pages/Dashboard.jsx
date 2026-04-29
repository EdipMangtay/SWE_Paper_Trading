// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, BarChart3, Activity } from 'lucide-react';
import { portfolioApi, marketApi } from '../services/api';
import { Spinner } from '../components/Loading.jsx';
import { fmtUSD, fmtPct, pctClass } from '../components/format.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [topCoins, setTopCoins] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [pf, coins] = await Promise.all([portfolioApi.get(), marketApi.prices(8)]);
      setPortfolio(pf);
      setTopCoins(coins);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading && !portfolio) return <Spinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-3xl font-bold">
          Merhaba, <span className="text-accent-green">{user?.username}</span>.
        </h1>
        <p className="text-white/60 text-sm mt-1">Portföyüne hoşgeldin.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Wallet}
          label="Toplam Değer"
          value={fmtUSD(portfolio?.totalValue)}
          accent="text-white"
        />
        <KpiCard
          icon={Activity}
          label="Nakit Bakiye"
          value={fmtUSD(portfolio?.cashBalance)}
          accent="text-accent-blue"
        />
        <KpiCard
          icon={BarChart3}
          label="Varlık Değeri"
          value={fmtUSD(portfolio?.assetsValue)}
          accent="text-accent-gold"
        />
        <KpiCard
          icon={(portfolio?.totalPnl ?? 0) >= 0 ? TrendingUp : TrendingDown}
          label="Toplam P&L"
          value={fmtUSD(portfolio?.totalPnl)}
          subtitle={fmtPct(portfolio?.totalPnlPct)}
          accent={pctClass(portfolio?.totalPnl)}
        />
      </div>

      {/* Holdings + Markets */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Holdings */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Varlıklarım</h2>
            <Link to="/portfolio" className="text-accent-green text-sm hover:underline">Tümünü gör →</Link>
          </div>
          {portfolio?.holdings?.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              Henüz varlığın yok. <Link to="/market" className="text-accent-green hover:underline">Piyasaya göz at →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {portfolio?.holdings?.slice(0, 6).map((h) => (
                <Link
                  key={h.coinId}
                  to={`/market/${h.coinId}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition"
                >
                  <div>
                    <div className="font-medium">{h.name}</div>
                    <div className="text-xs text-white/50 font-mono">{h.symbol} · {h.quantity.toFixed(4)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">{fmtUSD(h.value)}</div>
                    <div className={`text-xs font-mono ${pctClass(h.pnl)}`}>
                      {fmtPct(h.pnlPct)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Coins */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Piyasa</h2>
            <Link to="/market" className="text-accent-green text-sm hover:underline">Tümü →</Link>
          </div>
          <div className="space-y-2">
            {topCoins.map((c) => (
              <Link
                key={c.id}
                to={`/market/${c.id}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2">
                  {c.image && <img src={c.image} alt="" className="w-6 h-6 rounded-full" />}
                  <div>
                    <div className="text-sm font-medium">{c.symbol}</div>
                    <div className="text-xs text-white/40 font-mono">{c.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">{fmtUSD(c.current_price)}</div>
                  <div className={`text-xs font-mono ${pctClass(c.price_change_percentage_24h)}`}>
                    {fmtPct(c.price_change_percentage_24h)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, subtitle, accent = 'text-white' }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-white/50 font-mono">{label}</span>
        <Icon size={16} className="text-white/30" />
      </div>
      <div className={`font-display text-2xl font-bold font-mono ${accent}`}>{value}</div>
      {subtitle && <div className={`text-xs font-mono mt-1 ${accent}`}>{subtitle}</div>}
    </div>
  );
}
