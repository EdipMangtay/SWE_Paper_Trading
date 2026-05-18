// src/pages/Market.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, TrendingUp } from 'lucide-react';
import { marketApi } from '../services/api';
import { Spinner } from '../components/Loading.jsx';
import { fmtUSD, fmtPct, pctClass } from '../components/format.js';
import { useLivePrices } from '../services/wsClient.js';
import TickerBar from '../components/TickerBar.jsx';

export default function Market() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    marketApi.prices(50).then((c) => mounted && setCoins(c)).finally(() => mounted && setLoading(false));
    const id = setInterval(() => {
      marketApi.prices(50).then((c) => mounted && setCoins(c));
    }, 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const ids = useMemo(() => coins.map((c) => c.id), [coins]);
  const { prices: livePrices } = useLivePrices(ids);

  const filtered = coins.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.symbol?.toLowerCase().includes(q);
  });

  // Quick stats for the hero row
  const gainers = useMemo(() => {
    return [...coins].filter((c) => c.price_change_percentage_24h != null)
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 3);
  }, [coins]);

  const losers = useMemo(() => {
    return [...coins].filter((c) => c.price_change_percentage_24h != null)
      .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
      .slice(0, 3);
  }, [coins]);

  return (
    <>
      <TickerBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono mb-2">
              <span className="live-dot" /> Live · via Binance
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">
              Crypto <span className="gradient-text">Market</span>
            </h1>
            <p className="text-white/55 text-sm mt-1.5">
              Real-time prices for the top 50 assets. Click any row to open the exchange view.
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search BTC, Ethereum…"
              className="input pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Top gainers / losers strip */}
        {coins.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            <MoverCard label="Top gainers · 24h" rows={gainers} livePrices={livePrices} positive />
            <MoverCard label="Top losers · 24h"  rows={losers}  livePrices={livePrices} positive={false} />
          </div>
        )}

        {loading ? <Spinner /> : (
          <div className="card overflow-hidden card-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-[10px] uppercase tracking-[0.16em] text-white/45 font-mono">
                  <tr>
                    <th className="text-left  px-4 py-3">#</th>
                    <th className="text-left  px-4 py-3">Asset</th>
                    <th className="text-right px-4 py-3">Price</th>
                    <th className="text-right px-4 py-3 hidden sm:table-cell">24h</th>
                    <th className="text-right px-4 py-3 hidden md:table-cell">Volume / Mcap</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((c, i) => {
                    const live = livePrices[c.id] ?? c.current_price;
                    const change = c.price_change_percentage_24h;
                    return (
                      <tr key={c.id} className="hover:bg-white/5 transition group">
                        <td className="px-4 py-3 text-white/35 font-mono tabular-nums">{i + 1}</td>
                        <td className="px-4 py-3">
                          <Link to={`/market/${c.id}`} className="flex items-center gap-3 group-hover:text-accent-green">
                            {c.image
                              ? <img src={c.image} alt="" className="w-7 h-7 rounded-full ring-1 ring-white/10" />
                              : <div className="w-7 h-7 rounded-full bg-white/10 grid place-items-center text-[10px] font-mono">{c.symbol?.slice(0,2)}</div>}
                            <div>
                              <div className="font-medium">{c.name}</div>
                              <div className="text-xs text-white/40 font-mono">{c.symbol}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-medium">{fmtUSD(live)}</td>
                        <td className={`px-4 py-3 text-right font-mono tabular-nums hidden sm:table-cell ${pctClass(change)}`}>
                          {fmtPct(change)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-white/55 hidden md:table-cell">
                          {c.market_cap ? fmtUSD(c.market_cap, { digits: 0 })
                            : c.total_volume ? fmtUSD(c.total_volume, { digits: 0 })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link to={`/market/${c.id}`} className="btn-ghost text-xs">
                            <TrendingUp size={12} /> Trade
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-white/40">No results</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MoverCard({ label, rows, livePrices, positive }) {
  if (!rows?.length) return null;
  return (
    <div className="card p-3 card-in">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono mb-2 px-1">
        {label}
      </div>
      <div className="space-y-1">
        {rows.map((c) => {
          const live = livePrices[c.id] ?? c.current_price;
          return (
            <Link
              to={`/market/${c.id}`}
              key={c.id}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                {c.image && <img src={c.image} alt="" className="w-5 h-5 rounded-full" />}
                <span className="text-sm font-medium truncate">{c.name}</span>
                <span className="text-xs text-white/40 font-mono">{c.symbol}</span>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm tabular-nums">{fmtUSD(live)}</div>
                <div className={`text-[11px] font-mono tabular-nums ${positive ? 'text-accent-green' : 'text-accent-red'}`}>
                  {fmtPct(c.price_change_percentage_24h)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
