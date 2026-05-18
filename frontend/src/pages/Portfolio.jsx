// src/pages/Portfolio.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, History, Wallet, TrendingUp, TrendingDown, Coins } from 'lucide-react';
import { portfolioApi } from '../services/api';
import { Spinner, EmptyState } from '../components/Loading.jsx';
import { fmtUSD, fmtPct, fmtNum, pctClass } from '../components/format.js';
import { useLivePrices } from '../services/wsClient.js';

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    function load() {
      Promise.all([portfolioApi.get(), portfolioApi.history()])
        .then(([pf, txs]) => {
          if (!alive) return;
          setPortfolio(pf);
          setTransactions(txs);
        })
        .finally(() => alive && setLoading(false));
    }
    load();
    const id = window.setInterval(load, 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  const ids = useMemo(
    () => (portfolio?.holdings || []).map((h) => h.coinId),
    [portfolio]
  );
  const { prices: livePrices } = useLivePrices(ids);

  // Recompute portfolio values with live prices so the totals match the
  // per-row values exactly (no stale REST drift).
  const live = useMemo(() => {
    if (!portfolio) return null;
    const holdings = (portfolio.holdings || []).map((h) => {
      const mark = livePrices[h.coinId] ?? h.currentPrice ?? h.avgBuyPrice;
      const value = h.quantity * mark;
      const cost  = h.quantity * h.avgBuyPrice;
      const pnl   = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      return { ...h, mark, value, pnl, pnlPct };
    });
    const assetsValue = holdings.reduce((s, h) => s + h.value, 0);
    const totalValue  = (portfolio.cashBalance || 0) + assetsValue;
    const totalCost   = holdings.reduce((s, h) => s + h.quantity * h.avgBuyPrice, 0);
    const totalPnl    = assetsValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    return { ...portfolio, holdings, assetsValue, totalValue, totalPnl, totalPnlPct };
  }, [portfolio, livePrices]);

  if (loading) return <Spinner />;
  if (!live) return null;

  const positive = live.totalPnl >= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono mb-2">
          <span className="live-dot" /> Live valuation
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">
          My <span className="gradient-text">portfolio</span>
        </h1>
        <p className="text-white/55 text-sm mt-1.5">All your paper holdings, marked to live market prices.</p>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={Wallet}
          label="Total value"
          accent="text-white"
          glow="from-accent-blue/15 to-transparent"
        >
          <div className="font-display text-3xl font-bold font-mono tabular-nums">{fmtUSD(live.totalValue)}</div>
          <div className="text-xs text-white/45 font-mono mt-1">
            Cash <span className="tabular-nums text-accent-blue">{fmtUSD(live.cashBalance)}</span>
            <span className="text-white/25 mx-1.5">·</span>
            Assets <span className="tabular-nums text-accent-gold">{fmtUSD(live.assetsValue)}</span>
          </div>
        </SummaryCard>

        <SummaryCard
          icon={positive ? TrendingUp : TrendingDown}
          label="Unrealized P&L"
          accent={positive ? 'text-accent-green' : 'text-accent-red'}
          glow={positive ? 'from-accent-green/15 to-transparent' : 'from-accent-red/15 to-transparent'}
        >
          <div className={`font-display text-3xl font-bold font-mono tabular-nums ${positive ? 'text-accent-green' : 'text-accent-red'}`}>
            {positive ? '+' : ''}{fmtUSD(live.totalPnl)}
          </div>
          <div className={`text-sm font-mono tabular-nums ${positive ? 'text-accent-green' : 'text-accent-red'}`}>
            {fmtPct(live.totalPnlPct)}
          </div>
        </SummaryCard>

        <SummaryCard
          icon={Coins}
          label="Positions"
          accent="text-white"
          glow="from-accent-gold/15 to-transparent"
        >
          <div className="font-display text-3xl font-bold font-mono tabular-nums">{live.holdings.length}</div>
          <div className="text-xs text-white/45 font-mono mt-1">
            {transactions.length} fills · all-time
          </div>
        </SummaryCard>
      </div>

      {/* Holdings */}
      <div className="card overflow-hidden card-in">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2 bg-gradient-to-r from-ink-800/60 to-transparent">
          <Briefcase size={16} className="text-accent-green" />
          <h2 className="font-display text-lg font-semibold">Holdings</h2>
        </div>
        {live.holdings.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No holdings yet"
            hint="Browse the market and place your first trade."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-[10px] uppercase tracking-[0.16em] text-white/45 font-mono">
                <tr>
                  <th className="text-left  px-4 py-3">Asset</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">Avg. cost</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">Live price</th>
                  <th className="text-right px-4 py-3">Value</th>
                  <th className="text-right px-4 py-3">P&L</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {live.holdings.map((h) => {
                  const pos = h.pnl >= 0;
                  return (
                    <tr key={h.coinId} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <Link to={`/market/${h.coinId}`} className="hover:text-accent-green">
                          <div className="font-medium">{h.name}</div>
                          <div className="text-xs text-white/40 font-mono">{h.symbol}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtNum(h.quantity, 8)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-white/55 hidden sm:table-cell">{fmtUSD(h.avgBuyPrice)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums hidden sm:table-cell">{fmtUSD(h.mark)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-medium">{fmtUSD(h.value)}</td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${pos ? 'text-accent-green' : 'text-accent-red'}`}>
                        <div>{pos ? '+' : ''}{fmtUSD(h.pnl)}</div>
                        <div className="text-xs">{fmtPct(h.pnlPct)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/market/${h.coinId}?side=SELL`} className="btn-ghost text-xs">Sell</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div className="card overflow-hidden card-in">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2 bg-gradient-to-r from-ink-800/60 to-transparent">
          <History size={16} className="text-accent-blue" />
          <h2 className="font-display text-lg font-semibold">Trade history</h2>
        </div>
        {transactions.length === 0 ? (
          <EmptyState icon={History} title="No trades yet" hint="Fills will appear here after you place orders." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-[10px] uppercase tracking-[0.16em] text-white/45 font-mono">
                <tr>
                  <th className="text-left  px-4 py-3">Date</th>
                  <th className="text-left  px-4 py-3">Asset</th>
                  <th className="text-right px-4 py-3">Side</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-right px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-white/55 font-mono text-xs">
                      {new Date(t.createdAt).toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-white/40 font-mono">{t.symbol}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={t.side === 'BUY' ? 'pill-green' : 'pill-red'}>{t.side}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtNum(t.quantity, 8)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtUSD(t.price)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">{fmtUSD(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, accent, glow, children }) {
  return (
    <div className="relative card p-5 overflow-hidden card-in">
      <div className={`absolute inset-0 bg-gradient-to-br ${glow} pointer-events-none`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">{label}</span>
          <Icon size={16} className={accent + ' opacity-70'} />
        </div>
        {children}
      </div>
    </div>
  );
}
