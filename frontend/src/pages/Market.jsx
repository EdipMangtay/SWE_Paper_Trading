// src/pages/Market.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { marketApi } from '../services/api';
import { Spinner } from '../components/Loading.jsx';
import { fmtUSD, fmtPct, pctClass } from '../components/format.js';

export default function Market() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    marketApi.prices(50).then((c) => mounted && setCoins(c)).finally(() => mounted && setLoading(false));
    const id = setInterval(() => {
      marketApi.prices(50).then((c) => mounted && setCoins(c));
    }, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const filtered = coins.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.symbol?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Market</h1>
          <p className="text-white/60 text-sm mt-1">Live crypto prices · CoinGecko</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search symbol or name…"
            className="input pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50 font-mono">
                <tr>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Asset</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">24h</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">Market cap</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((c, i) => (
                  <tr key={c.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-white/40 font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link to={`/market/${c.id}`} className="flex items-center gap-3 hover:text-accent-green">
                        {c.image && <img src={c.image} alt="" className="w-7 h-7 rounded-full" />}
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-white/40 font-mono">{c.symbol}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{fmtUSD(c.current_price)}</td>
                    <td className={`px-4 py-3 text-right font-mono hidden sm:table-cell ${pctClass(c.price_change_percentage_24h)}`}>
                      {fmtPct(c.price_change_percentage_24h)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white/60 hidden md:table-cell">
                      {c.market_cap ? fmtUSD(c.market_cap, { digits: 0 }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/trade/${c.id}`} className="btn-ghost text-xs">Trade</Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-white/40">No results</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
