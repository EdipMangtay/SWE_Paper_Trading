// Exchange-style Buy/Sell panel on the left rail of MarketDetail.
//
// Lifecycle: validates locally, calls POST /api/orders, then hands the
// result (or error message) back to the parent through onTraded / onError so
// the parent can surface toasts. We keep submitting state internally.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../services/api';
import { fmtUSD, fmtNum } from './format.js';

export default function TradePanel({
  coin,
  portfolio,
  isAuthenticated,
  initialSide = 'BUY',
  onTraded,
  onError
}) {
  const [side, setSide]             = useState(initialSide);
  const [type, setType]             = useState('MARKET');
  const [qty, setQty]               = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [pct, setPct]               = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const livePrice = coin?.current_price || 0;
  const holding   = portfolio?.holdings?.find((h) => h.coinId === coin?.id);
  const heldQty   = holding?.quantity || 0;
  const cash      = portfolio?.cashBalance || 0;

  useEffect(() => {
    if (type === 'LIMIT' && !limitPrice && livePrice) {
      setLimitPrice(livePrice.toString());
    }
  }, [type, livePrice, limitPrice]);

  useEffect(() => { setSide(initialSide); }, [initialSide]);

  const usePrice = type === 'LIMIT' ? parseFloat(limitPrice || '0') : livePrice;

  const totalCost = useMemo(() => {
    const q = parseFloat(qty || '0');
    return q > 0 && usePrice > 0 ? q * usePrice : 0;
  }, [qty, usePrice]);

  function applyPercent(p) {
    setPct(p);
    if (side === 'BUY') {
      if (usePrice > 0) setQty(((cash * p) / usePrice).toFixed(8));
    } else {
      setQty((heldQty * p).toFixed(8));
    }
  }

  async function submit(e) {
    e.preventDefault();
    const q = parseFloat(qty);
    if (!(q > 0))                                  { onError?.('Quantity must be positive'); return; }
    if (type === 'LIMIT' && !(parseFloat(limitPrice) > 0)) { onError?.('Limit price must be positive'); return; }

    setSubmitting(true);
    try {
      const payload = { coinId: coin.id, type, side, quantity: q };
      if (type === 'LIMIT') payload.price = parseFloat(limitPrice);
      const order = await orderApi.create(payload);
      setQty(''); setPct(0);
      onTraded?.(order);
    } catch (err) {
      onError?.(err.response?.data?.message || 'Trade failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="card p-5">
        <div className="text-sm text-white/70 mb-3">
          Sign in to place orders on <span className="text-white font-medium">{coin?.name}</span>.
        </div>
        <Link to="/login" className="btn-primary w-full">Sign in to trade</Link>
        <Link to="/register" className="btn-ghost w-full mt-2">Create account</Link>
      </div>
    );
  }

  const isBuy = side === 'BUY';

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-lg">
        <button
          type="button"
          onClick={() => setSide('BUY')}
          className={`py-2 rounded-md text-sm font-semibold tracking-wide transition ${
            isBuy ? 'bg-accent-green text-ink-900 shadow-glow' : 'text-white/55 hover:text-white'
          }`}
        >
          BUY · LONG
        </button>
        <button
          type="button"
          onClick={() => setSide('SELL')}
          className={`py-2 rounded-md text-sm font-semibold tracking-wide transition ${
            !isBuy ? 'bg-accent-red text-white' : 'text-white/55 hover:text-white'
          }`}
        >
          SELL · SHORT
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-lg">
        {['MARKET', 'LIMIT'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition ${
              type === t ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        <label className="label flex items-center justify-between">
          <span>Price (USD)</span>
          <span className="text-[10px] font-mono text-white/40 uppercase">
            {type === 'MARKET' ? 'Mark' : 'Limit'}
          </span>
        </label>
        <div className="relative">
          <input
            type="number"
            step="any"
            className="input font-mono pr-12"
            value={type === 'LIMIT' ? limitPrice : (livePrice ? livePrice.toString() : '')}
            onChange={(e) => setLimitPrice(e.target.value)}
            disabled={type === 'MARKET'}
            placeholder="0.00"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/40">
            USD
          </span>
        </div>
      </div>

      <div>
        <label className="label flex items-center justify-between">
          <span>Amount ({coin?.symbol})</span>
          <span className="text-[10px] font-mono text-white/40">
            {side === 'BUY' ? `Avail. ${fmtUSD(cash)}` : `Held ${fmtNum(heldQty, 6)} ${coin?.symbol}`}
          </span>
        </label>
        <div className="relative">
          <input
            type="number"
            step="any"
            required
            className="input font-mono pr-14"
            value={qty}
            onChange={(e) => { setQty(e.target.value); setPct(0); }}
            placeholder="0.00"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/40">
            {coin?.symbol}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1 mt-2">
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => applyPercent(p)}
              className={`text-[11px] font-mono py-1 rounded-md transition ${
                pct === p
                  ? (isBuy ? 'bg-accent-green/25 text-accent-green' : 'bg-accent-red/25 text-accent-red')
                  : 'bg-white/5 hover:bg-white/10 text-white/60'
              }`}
            >
              {Math.round(p * 100)}%
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-white/5 px-3 py-2.5 space-y-1.5 text-xs font-mono">
        <Row k="Order type" v={`${type} ${side}`} />
        <Row k="Price used" v={usePrice ? fmtUSD(usePrice) : '—'} />
        <Row k="Total" v={fmtUSD(totalCost)} accent={isBuy ? 'text-accent-green' : 'text-accent-red'} />
        {side === 'BUY'
          ? <Row k="After trade · cash" v={fmtUSD(Math.max(cash - totalCost, 0))} muted />
          : <Row k="After trade · qty"  v={`${fmtNum(Math.max(heldQty - parseFloat(qty || '0'), 0), 6)} ${coin?.symbol}`} muted />
        }
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={isBuy ? 'btn-primary w-full py-3' : 'btn-danger w-full py-3'}
      >
        {submitting
          ? 'Submitting…'
          : `${isBuy ? 'BUY' : 'SELL'} ${coin?.symbol || ''} · ${type}`}
      </button>
    </form>
  );
}

function Row({ k, v, accent, muted }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-white/35' : 'text-white/55'}>{k}</span>
      <span className={accent ? `${accent} font-bold` : 'text-white'}>{v}</span>
    </div>
  );
}
