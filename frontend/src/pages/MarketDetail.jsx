// src/pages/MarketDetail.jsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { marketApi } from '../services/api';
import { Spinner } from '../components/Loading.jsx';
import { fmtUSD, fmtPct, pctClass } from '../components/format.js';
import PriceChart from '../components/PriceChart.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function MarketDetail() {
  const { coinId } = useParams();
  const { user } = useAuth();
  const [coin, setCoin] = useState(null);
  const [history, setHistory] = useState([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      marketApi.coin(coinId),
      marketApi.history(coinId, days)
    ]).then(([c, h]) => {
      setCoin(c);
      setHistory(h);
    }).finally(() => setLoading(false));
  }, [coinId, days]);

  if (loading && !coin) return <Spinner />;
  if (!coin) return null;

  const isUp = (coin.price_change_percentage_24h ?? 0) >= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/market" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6">
        <ArrowLeft size={16} /> Back to market
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Chart + Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {coin.image && <img src={coin.image} alt="" className="w-12 h-12 rounded-full" />}
                <div>
                  <h1 className="font-display text-2xl font-bold">{coin.name}</h1>
                  <div className="text-white/50 font-mono text-sm">{coin.symbol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-3xl font-bold font-mono">{fmtUSD(coin.current_price)}</div>
                <div className={`flex items-center justify-end gap-1 font-mono text-sm ${pctClass(coin.price_change_percentage_24h)}`}>
                  {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {fmtPct(coin.price_change_percentage_24h)} (24h)
                </div>
              </div>
            </div>

            {/* Time range */}
            <div className="flex gap-2 mb-4">
              {[1, 7, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition ${
                    days === d ? 'bg-accent-green text-ink-900' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {d === 1 ? '1D' : `${d}D`}
                </button>
              ))}
            </div>

            <PriceChart data={history} color={isUp ? '#10B981' : '#EF4444'} />
          </div>

          {/* Stats */}
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Statistics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Stat label="Market cap" value={coin.market_cap ? fmtUSD(coin.market_cap, { digits: 0 }) : '—'} />
              <Stat label="7d change" value={fmtPct(coin.price_change_percentage_7d)} className={pctClass(coin.price_change_percentage_7d)} />
              <Stat label="30d change" value={fmtPct(coin.price_change_percentage_30d)} className={pctClass(coin.price_change_percentage_30d)} />
            </div>
            {coin.description && (
              <p className="text-white/60 text-sm mt-6 leading-relaxed">{coin.description}.</p>
            )}
          </div>
        </div>

        {/* Right: CTA */}
        <div className="card p-6 h-fit lg:sticky lg:top-20">
          <h2 className="font-display text-lg font-semibold">Quick trade</h2>
          <p className="text-white/60 text-sm mt-1">Place a buy or sell order for {coin.name}</p>
          {user ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link to={`/trade/${coinId}?side=BUY`} className="btn-primary">Buy</Link>
              <Link to={`/trade/${coinId}?side=SELL`} className="btn-danger">Sell</Link>
            </div>
          ) : (
            <div className="mt-4">
              <Link to="/login" className="btn-primary w-full">Sign in to trade</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, className = '' }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-white/40 font-mono mb-1">{label}</div>
      <div className={`font-mono font-semibold ${className || 'text-white'}`}>{value}</div>
    </div>
  );
}
