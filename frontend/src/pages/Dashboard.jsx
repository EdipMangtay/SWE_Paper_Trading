// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, BarChart3, Activity, ArrowRight, Coins } from 'lucide-react';
import { portfolioApi, marketApi } from '../services/api';
import { Spinner } from '../components/Loading.jsx';
import { fmtUSD, fmtPct, fmtNum, pctClass } from '../components/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLivePrices } from '../services/wsClient.js';
import TickerBar from '../components/TickerBar.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [topCoins, setTopCoins] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [pf, coins] = await Promise.all([portfolioApi.get(), marketApi.prices(10)]);
      setPortfolio(pf);
      setTopCoins(coins);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  // Build the union of (top coin ids + my holding ids) — one subscription pays
  // for both the "Market" widget and the "Holdings" widget.
  const ids = useMemo(() => {
    const set = new Set();
    for (const c of topCoins || []) set.add(c.id);
    for (const h of portfolio?.holdings || []) set.add(h.coinId);
    return Array.from(set);
  }, [topCoins, portfolio]);

  const { prices: live } = useLivePrices(ids);

  // Recompute portfolio totals with live prices to match what we render below.
  const liveValues = useMemo(() => {
    if (!portfolio) return null;
    let assetsValue = 0;
    let totalCost   = 0;
    const holdings = (portfolio.holdings || []).map((h) => {
      const mark = live[h.coinId] ?? h.currentPrice ?? h.avgBuyPrice;
      const value = h.quantity * mark;
      const cost = h.quantity * h.avgBuyPrice;
      assetsValue += value;
      totalCost   += cost;
      return { ...h, mark, value, pnl: value - cost, pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0 };
    });
    const totalValue  = (portfolio.cashBalance || 0) + assetsValue;
    const totalPnl    = assetsValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    return { ...portfolio, holdings, assetsValue, totalValue, totalPnl, totalPnlPct };
  }, [portfolio, live]);

  if (loading && !portfolio) return <Spinner />;
  if (!liveValues) return null;

  const pos = liveValues.totalPnl >= 0;

  return (
    <>
      <TickerBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono mb-2">
              <span className="live-dot" /> Live market
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">
              Welcome, <span className="gradient-text">{user?.username}</span>
            </h1>
            <p className="text-white/55 text-sm mt-1.5">Here's a snapshot of your paper portfolio.</p>
          </div>
          <Link to="/market" className="btn-primary self-start sm:self-end">
            Explore market <ArrowRight size={14} />
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi
            icon={Wallet}
            label="Total value"
            value={fmtUSD(liveValues.totalValue)}
            accent="text-white"
            glow="from-white/10"
          />
          <Kpi
            icon={Activity}
            label="Cash balance"
            value={fmtUSD(liveValues.cashBalance)}
            accent="text-accent-blue"
            glow="from-accent-blue/20"
          />
          <Kpi
            icon={BarChart3}
            label="Assets value"
            value={fmtUSD(liveValues.assetsValue)}
            accent="text-accent-gold"
            glow="from-accent-gold/20"
          />
          <Kpi
            icon={pos ? TrendingUp : TrendingDown}
            label="Total P&L"
            value={`${pos ? '+' : ''}${fmtUSD(liveValues.totalPnl)}`}
            subtitle={fmtPct(liveValues.totalPnlPct)}
            accent={pos ? 'text-accent-green' : 'text-accent-red'}
            glow={pos ? 'from-accent-green/20' : 'from-accent-red/20'}
          />
        </div>

        {/* Holdings + Markets */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Holdings */}
          <div className="card p-5 lg:col-span-2 card-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-accent-green" />
                <h2 className="font-display text-lg font-semibold">My holdings</h2>
              </div>
              <Link to="/portfolio" className="text-accent-green text-sm hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {liveValues.holdings.length === 0 ? (
              <div className="text-center py-12 text-white/45">
                You have no holdings yet.{' '}
                <Link to="/market" className="text-accent-green hover:underline">Browse the market →</Link>
              </div>
            ) : (
              <div className="space-y-1">
                {liveValues.holdings.slice(0, 8).map((h) => {
                  const p = h.pnl >= 0;
                  return (
                    <Link
                      key={h.coinId}
                      to={`/market/${h.coinId}`}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg hover:bg-white/5 transition group"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{h.name}</div>
                        <div className="text-xs text-white/45 font-mono">
                          {h.symbol} · {fmtNum(h.quantity, 6)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono tabular-nums">{fmtUSD(h.value)}</div>
                        <div className={`text-xs font-mono tabular-nums ${p ? 'text-accent-green' : 'text-accent-red'}`}>
                          {p ? '+' : ''}{fmtUSD(h.pnl)} ({fmtPct(h.pnlPct)})
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Coins */}
          <div className="card p-5 card-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-accent-blue" />
                <h2 className="font-display text-lg font-semibold">Market</h2>
              </div>
              <Link to="/market" className="text-accent-green text-sm hover:underline inline-flex items-center gap-1">
                All <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-1">
              {topCoins.map((c) => {
                const priceLive = live[c.id] ?? c.current_price;
                return (
                  <Link
                    key={c.id}
                    to={`/market/${c.id}`}
                    className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {c.image && <img src={c.image} alt="" className="w-6 h-6 rounded-full" />}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.symbol}</div>
                        <div className="text-xs text-white/40 font-mono truncate">{c.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono tabular-nums">{fmtUSD(priceLive)}</div>
                      <div className={`text-xs font-mono tabular-nums ${pctClass(c.price_change_percentage_24h)}`}>
                        {fmtPct(c.price_change_percentage_24h)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Kpi({ icon: Icon, label, value, subtitle, accent = 'text-white', glow = 'from-white/10' }) {
  return (
    <div className="relative card p-5 overflow-hidden card-in">
      <div className={`absolute inset-0 bg-gradient-to-br ${glow} to-transparent pointer-events-none`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">{label}</span>
          <Icon size={16} className={accent + ' opacity-70'} />
        </div>
        <div className={`font-display text-2xl font-bold font-mono tabular-nums ${accent}`}>{value}</div>
        {subtitle && <div className={`text-xs font-mono tabular-nums mt-1 ${accent}`}>{subtitle}</div>}
      </div>
    </div>
  );
}
