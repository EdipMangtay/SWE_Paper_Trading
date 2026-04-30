// src/pages/Leaderboard.jsx
import { useEffect, useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { leaderboardApi } from '../services/api';
import { Spinner } from '../components/Loading.jsx';
import { fmtUSD, fmtPct, pctClass } from '../components/format.js';

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [sort, setSort] = useState('value');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    leaderboardApi.get(sort, 50).then(setRows).finally(() => setLoading(false));
  }, [sort]);

  const RankIcon = ({ rank }) => {
    if (rank === 1) return <Trophy size={16} className="text-accent-gold" />;
    if (rank === 2) return <Medal size={16} className="text-white/60" />;
    if (rank === 3) return <Award size={16} className="text-amber-700" />;
    return <span className="text-white/40 font-mono">{rank}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Leaderboard</h1>
          <p className="text-white/60 text-sm mt-1">Top paper traders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSort('value')}
            className={`px-3 py-1.5 rounded-md text-sm font-mono transition ${
              sort === 'value' ? 'bg-accent-green text-ink-900' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Total value
          </button>
          <button
            onClick={() => setSort('pnlPct')}
            className={`px-3 py-1.5 rounded-md text-sm font-mono transition ${
              sort === 'pnlPct' ? 'bg-accent-green text-ink-900' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            P&L %
          </button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50 font-mono">
                <tr>
                  <th className="text-left px-4 py-3 w-16">#</th>
                  <th className="text-left px-4 py-3">Trader</th>
                  <th className="text-right px-4 py-3">Total value</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">Cash</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">Assets</th>
                  <th className="text-right px-4 py-3">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.username} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="w-8 h-8 grid place-items-center"><RankIcon rank={r.rank} /></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.username}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{fmtUSD(r.totalValue)}</td>
                    <td className="px-4 py-3 text-right font-mono text-white/60 hidden sm:table-cell">{fmtUSD(r.cashBalance)}</td>
                    <td className="px-4 py-3 text-right font-mono text-white/60 hidden sm:table-cell">{fmtUSD(r.assetsValue)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${pctClass(r.pnl)}`}>
                      <div>{fmtUSD(r.pnl)}</div>
                      <div className="text-xs">{fmtPct(r.pnlPct)}</div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-white/40">No rankings yet</td>
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
