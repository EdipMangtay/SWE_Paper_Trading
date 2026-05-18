// Horizontal scrolling ticker strip — live BTC/ETH/SOL etc. prices.
// Subscribes to the same WebSocket stream as the rest of the app so updates
// arrive without polling.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { marketApi } from '../services/api';
import { useLivePrices } from '../services/wsClient.js';
import { fmtUSD, fmtPct, pctClass } from './format.js';

const FEATURED = [
  'bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple',
  'cardano', 'dogecoin', 'avalanche-2', 'chainlink', 'polkadot'
];

export default function TickerBar() {
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    let alive = true;
    marketApi.prices(25)
      .then((rows) => {
        if (!alive || !rows?.length) return;
        const byId = new Map(rows.map((c) => [c.id, c]));
        const ordered = FEATURED.map((id) => byId.get(id)).filter(Boolean);
        // Append any extra coins from the top-25 not already in FEATURED, capped at 14 total
        for (const c of rows) {
          if (ordered.length >= 14) break;
          if (!ordered.find((x) => x.id === c.id)) ordered.push(c);
        }
        setCoins(ordered);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const ids = useMemo(() => coins.map((c) => c.id), [coins]);
  const { prices } = useLivePrices(ids);

  if (!coins.length) return null;

  const items = coins.map((c) => ({
    ...c,
    livePrice: prices[c.id] ?? c.current_price
  }));

  // Double the items so the marquee can loop seamlessly
  const loop = [...items, ...items];

  return (
    <div className="border-b border-white/5 bg-ink-900/50 backdrop-blur overflow-hidden">
      <div className="relative">
        <div className="flex gap-6 py-2 px-4 whitespace-nowrap ticker-marquee w-max">
          {loop.map((c, idx) => (
            <Link
              key={`${c.id}-${idx}`}
              to={`/market/${c.id}`}
              className="inline-flex items-center gap-2 text-xs hover:text-white transition group"
            >
              {c.image && <img src={c.image} alt="" className="w-4 h-4 rounded-full" />}
              <span className="font-mono text-white/70 group-hover:text-white">{c.symbol}</span>
              <span className="font-mono tabular-nums text-white">{fmtUSD(c.livePrice)}</span>
              <span className={`font-mono tabular-nums ${pctClass(c.price_change_percentage_24h)}`}>
                {fmtPct(c.price_change_percentage_24h)}
              </span>
            </Link>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-ink-900 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-ink-900 to-transparent" />
      </div>
    </div>
  );
}
