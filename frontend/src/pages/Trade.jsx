// src/pages/Trade.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { marketApi, orderApi, portfolioApi } from '../services/api';
import { Spinner, ErrorBox } from '../components/Loading.jsx';
import { fmtUSD, fmtNum } from '../components/format.js';

export default function Trade() {
  const { coinId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [coin, setCoin] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [side, setSide] = useState(params.get('side') === 'SELL' ? 'SELL' : 'BUY');
  const [type, setType] = useState('MARKET');
  const [qty, setQty] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [c, pf] = await Promise.all([marketApi.coin(coinId), portfolioApi.get()]);
      setCoin(c);
      setPortfolio(pf);
      if (type === 'LIMIT' && !limitPrice) setLimitPrice(c.current_price?.toString() || '');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [coinId]);

  const holding = portfolio?.holdings?.find((h) => h.coinId === coinId);
  const heldQty = holding?.quantity || 0;
  const cash = portfolio?.cashBalance || 0;
  const livePrice = coin?.current_price || 0;

  const usePrice = type === 'LIMIT' ? parseFloat(limitPrice || '0') : livePrice;
  const totalCost = useMemo(() => {
    const q = parseFloat(qty || '0');
    return q > 0 && usePrice > 0 ? q * usePrice : 0;
  }, [qty, usePrice]);

  function setQtyFromPercent(pct) {
    if (side === 'BUY') {
      if (usePrice > 0) {
        const q = (cash * pct) / usePrice;
        setQty(q.toFixed(8));
      }
    } else {
      const q = heldQty * pct;
      setQty(q.toFixed(8));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    const q = parseFloat(qty);
    if (!(q > 0)) { setError('Miktar pozitif olmalı'); return; }
    if (type === 'LIMIT' && !(parseFloat(limitPrice) > 0)) {
      setError('Limit fiyat pozitif olmalı'); return;
    }
    setSubmitting(true);
    try {
      const payload = { coinId, type, side, quantity: q };
      if (type === 'LIMIT') payload.price = parseFloat(limitPrice);
      const order = await orderApi.create(payload);
      if (order.status === 'FILLED') {
        setSuccess(`Emir gerçekleşti: ${side} ${q} ${coin.symbol} @ ${fmtUSD(order.executedPrice)}`);
      } else {
        setSuccess(`Emir oluşturuldu (${order.status}). Tetiklendiğinde otomatik gerçekleşecek.`);
      }
      setQty('');
      await load();
      setTimeout(() => navigate('/portfolio'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'İşlem başarısız');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !coin) return <Spinner />;
  if (!coin) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link to={`/market/${coinId}`} className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6">
        <ArrowLeft size={16} /> Detaya geri dön
      </Link>

      <div className="card p-6 mb-4">
        <div className="flex items-center gap-4">
          {coin.image && <img src={coin.image} alt="" className="w-12 h-12 rounded-full" />}
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">{coin.name}</h1>
            <div className="text-white/50 font-mono text-sm">{coin.symbol}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/40 font-mono uppercase">Canlı fiyat</div>
            <div className="font-mono text-xl">{fmtUSD(livePrice)}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {/* Side toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-lg">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2 rounded-md font-medium transition ${
              side === 'BUY' ? 'bg-accent-green text-ink-900' : 'text-white/60 hover:text-white'
            }`}
          >
            ALIM
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2 rounded-md font-medium transition ${
              side === 'SELL' ? 'bg-accent-red text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            SATIM
          </button>
        </div>

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-lg">
          {['MARKET', 'LIMIT'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`py-1.5 rounded-md text-sm font-mono transition ${
                type === t ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Limit price */}
        {type === 'LIMIT' && (
          <div>
            <label className="label">Limit fiyat (USD)</label>
            <input
              type="number"
              step="any"
              className="input font-mono"
              required
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="Örn. 60000"
            />
            <div className="text-xs text-white/40 mt-1">
              {side === 'BUY' ? 'Fiyat bu seviyeye düştüğünde alım yapılır' : 'Fiyat bu seviyeye çıktığında satım yapılır'}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="label">Miktar ({coin.symbol})</label>
          <input
            type="number"
            step="any"
            className="input font-mono"
            required
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0.00"
          />
          <div className="flex gap-2 mt-2">
            {[0.25, 0.5, 0.75, 1].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setQtyFromPercent(p)}
                className="text-xs font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60"
              >
                {Math.round(p * 100)}%
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white/5 rounded-lg p-4 space-y-2 text-sm font-mono">
          <Row label="Kullanılacak fiyat" value={fmtUSD(usePrice)} />
          <Row label="Toplam" value={fmtUSD(totalCost)} accent />
          {side === 'BUY' ? (
            <Row label="Mevcut nakit" value={fmtUSD(cash)} muted />
          ) : (
            <Row label={`Mevcut ${coin.symbol}`} value={fmtNum(heldQty, 8)} muted />
          )}
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}
        {success && (
          <div className="bg-accent-green/10 border border-accent-green/30 text-accent-green rounded-lg px-4 py-3 text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={side === 'BUY' ? 'btn-primary w-full' : 'btn-danger w-full'}
        >
          {submitting ? 'Gönderiliyor…' : `${side === 'BUY' ? 'AL' : 'SAT'} · ${type}`}
        </button>
      </form>
    </div>
  );
}

function Row({ label, value, accent, muted }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-white/40' : 'text-white/60'}>{label}</span>
      <span className={accent ? 'text-accent-green font-bold' : 'text-white'}>{value}</span>
    </div>
  );
}
