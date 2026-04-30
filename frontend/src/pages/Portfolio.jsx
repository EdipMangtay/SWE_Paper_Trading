// src/pages/Portfolio.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, History } from 'lucide-react';
import { portfolioApi } from '../services/api';
import { Spinner, EmptyState } from '../components/Loading.jsx';
import { fmtUSD, fmtPct, fmtNum, pctClass } from '../components/format.js';

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([portfolioApi.get(), portfolioApi.history()])
      .then(([pf, txs]) => {
        setPortfolio(pf);
        setTransactions(txs);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!portfolio) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">My portfolio</h1>
        <p className="text-white/60 text-sm mt-1">Live view of all your holdings</p>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-white/50 font-mono mb-2">Total value</div>
          <div className="font-display text-3xl font-bold font-mono">{fmtUSD(portfolio.totalValue)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-white/50 font-mono mb-2">P&L</div>
          <div className={`font-display text-3xl font-bold font-mono ${pctClass(portfolio.totalPnl)}`}>
            {fmtUSD(portfolio.totalPnl)}
          </div>
          <div className={`text-sm font-mono ${pctClass(portfolio.totalPnlPct)}`}>
            {fmtPct(portfolio.totalPnlPct)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-white/50 font-mono mb-2">Cash / assets</div>
          <div className="font-mono text-lg">
            <span className="text-accent-blue">{fmtUSD(portfolio.cashBalance)}</span>
            <span className="text-white/30 mx-2">/</span>
            <span className="text-accent-gold">{fmtUSD(portfolio.assetsValue)}</span>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <Briefcase size={16} className="text-accent-green" />
          <h2 className="font-display text-lg font-semibold">Holdings</h2>
        </div>
        {portfolio.holdings.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No holdings yet"
            hint="Browse the market and place your first trade."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50 font-mono">
                <tr>
                  <th className="text-left px-4 py-3">Asset</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">Avg. cost</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">Live price</th>
                  <th className="text-right px-4 py-3">Value</th>
                  <th className="text-right px-4 py-3">P&L</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {portfolio.holdings.map((h) => (
                  <tr key={h.coinId} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium">{h.name}</div>
                      <div className="text-xs text-white/40 font-mono">{h.symbol}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{fmtNum(h.quantity, 8)}</td>
                    <td className="px-4 py-3 text-right font-mono text-white/60 hidden sm:table-cell">{fmtUSD(h.avgBuyPrice)}</td>
                    <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">{fmtUSD(h.currentPrice)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtUSD(h.value)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${pctClass(h.pnl)}`}>
                      <div>{fmtUSD(h.pnl)}</div>
                      <div className="text-xs">{fmtPct(h.pnlPct)}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/trade/${h.coinId}?side=SELL`} className="btn-ghost text-xs">Sell</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <History size={16} className="text-accent-blue" />
          <h2 className="font-display text-lg font-semibold">Trade history</h2>
        </div>
        {transactions.length === 0 ? (
          <EmptyState icon={History} title="No trades yet" hint="Fills will appear here after you place orders." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50 font-mono">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Asset</th>
                  <th className="text-right px-4 py-3">Side</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-right px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-white/60 font-mono text-xs">
                      {new Date(t.createdAt).toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-white/40 font-mono">{t.symbol}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={t.side === 'BUY' ? 'pill-green' : 'pill-red'}>{t.side}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{fmtNum(t.quantity, 8)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmtUSD(t.price)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{fmtUSD(t.total)}</td>
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
