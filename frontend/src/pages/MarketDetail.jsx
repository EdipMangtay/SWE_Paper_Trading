// Exchange-style trading screen.
//
//   header   : coin info + LIVE price (WebSocket) + 24h/7d/30d + market cap
//   left     : Buy/Sell panel (sticky)
//   center   : interval toolbar + TradingView Advanced Chart
//   right    : Position card for this coin (with Close button) + About
//   bottom   : tabs [Positions] [Open Orders] [Market History]
//
// All mutations go through the orderApi and surface as toast notifications.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, X, Wifi, WifiOff, Clock
} from 'lucide-react';
import { marketApi, orderApi, portfolioApi } from '../services/api';
import { Spinner } from '../components/Loading.jsx';
import { fmtUSD, fmtPct, fmtNum, pctClass } from '../components/format.js';
import TradingViewChart from '../components/TradingViewChart.jsx';
import TradePanel from '../components/TradePanel.jsx';
import { coinIdToTradingViewSymbol } from '../utils/tradingViewSymbol.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { useLivePrice, useLivePrices } from '../services/wsClient.js';

const INTERVALS = [
  { label: '15m', value: '15' },
  { label: '1H',  value: '60' },
  { label: '4H',  value: '240' },
  { label: '1D',  value: 'D' },
  { label: '1W',  value: 'W' }
];

export default function MarketDetail() {
  const { coinId } = useParams();
  const [params]   = useSearchParams();
  const { user }   = useAuth();
  const toast      = useToast();

  const [coin, setCoin]               = useState(null);
  const [portfolio, setPortfolio]     = useState(null);
  const [openOrders, setOpenOrders]   = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab]                 = useState('positions');
  const [chartInterval, setChartInterval] = useState('60');
  const [loading, setLoading]         = useState(true);
  const [closing, setClosing]         = useState(null);

  const initialSide = params.get('side') === 'SELL' ? 'SELL' : 'BUY';

  const loadCoin = useCallback(async () => {
    const c = await marketApi.coin(coinId);
    setCoin(c);
  }, [coinId]);

  const loadUserData = useCallback(async () => {
    if (!user) {
      setPortfolio(null);
      setOpenOrders([]);
      setTransactions([]);
      return;
    }
    const [pf, pendingOrders, history] = await Promise.all([
      portfolioApi.get(),
      orderApi.list('PENDING'),
      portfolioApi.history()
    ]);
    setPortfolio(pf);
    setOpenOrders(pendingOrders || []);
    setTransactions((history || []).filter((t) => t.coinId === coinId));
  }, [coinId, user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCoin(), loadUserData()]).finally(() => setLoading(false));
  }, [loadCoin, loadUserData]);

  // Refresh static coin meta (image, market cap, 24h %) every 60s; live price
  // updates faster via the WebSocket below.
  useEffect(() => {
    const id = window.setInterval(() => {
      loadCoin();
      if (user) loadUserData();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [loadCoin, loadUserData, user]);

  const tvSymbol = useMemo(
    () => coinIdToTradingViewSymbol(coinId, coin?.symbol),
    [coinId, coin?.symbol]
  );

  // Live price for the focused coin (WS-driven, falls back to REST value)
  const { price: livePrice, isLive, ts: liveTs } = useLivePrice(
    coinId,
    coin?.current_price ?? null
  );

  // Live prices for all open positions in the bottom panel
  const positionIds = useMemo(
    () => (portfolio?.holdings || []).map((h) => h.coinId),
    [portfolio]
  );
  const { prices: positionPrices } = useLivePrices(positionIds);

  const holding = portfolio?.holdings?.find((h) => h.coinId === coinId);

  async function cancelOrder(id) {
    try {
      await orderApi.cancel(id);
      toast.info('Order cancelled');
      await loadUserData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    }
  }

  async function closePosition(coin_) {
    if (!coin_?.coinId) return;
    if (!window.confirm(`Close ${coin_.quantity} ${coin_.symbol} at market price?`)) return;
    setClosing(coin_.coinId);
    try {
      const res = await orderApi.close(coin_.coinId);
      const sign = res.realizedPnl >= 0 ? '+' : '';
      toast.success(
        `Closed ${coin_.symbol} · realized ${sign}${fmtUSD(res.realizedPnl)} (${fmtPct(res.realizedPnlPct)})`,
        { title: res.realizedPnl >= 0 ? 'Profit' : 'Loss', duration: 6000 }
      );
      await loadUserData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Close failed');
    } finally {
      setClosing(null);
    }
  }

  if (loading && !coin) return <Spinner />;
  if (!coin) return null;

  const isUp = (coin.price_change_percentage_24h ?? 0) >= 0;
  const priceForDisplay = livePrice ?? coin.current_price;

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
      <Link
        to="/market"
        className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-3"
      >
        <ArrowLeft size={16} /> Back to market
      </Link>

      {/* Top ticker / header */}
      <div className="card px-4 sm:px-5 py-3 mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {coin.image && (
            <img src={coin.image} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold truncate">{coin.name}</h1>
              <span className="pill-mute">{coin.symbol}/USDT</span>
              <LiveBadge isLive={isLive} ts={liveTs} />
            </div>
            <div className="text-[11px] text-white/40 font-mono uppercase tracking-wider">
              Spot · Paper Trading
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <Stat
            label="Last price"
            value={fmtUSD(priceForDisplay)}
            valueClass={isUp ? 'text-accent-green' : 'text-accent-red'}
            big
            flashKey={priceForDisplay}
          />
          <Stat
            label="24h change"
            value={
              <span className={`inline-flex items-center gap-1 ${pctClass(coin.price_change_percentage_24h)}`}>
                {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {fmtPct(coin.price_change_percentage_24h)}
              </span>
            }
          />
          <Stat label="7d" value={
            <span className={pctClass(coin.price_change_percentage_7d)}>
              {fmtPct(coin.price_change_percentage_7d)}
            </span>
          } />
          <Stat label="30d" value={
            <span className={pctClass(coin.price_change_percentage_30d)}>
              {fmtPct(coin.price_change_percentage_30d)}
            </span>
          } />
          <Stat
            label="Market cap"
            value={coin.market_cap ? fmtUSD(coin.market_cap, { digits: 0 }) : '—'}
          />
        </div>
      </div>

      {/* Main exchange grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* LEFT — Trade panel */}
        <aside className="lg:col-span-3 xl:col-span-3 order-2 lg:order-1">
          <div className="lg:sticky lg:top-20">
            <TradePanel
              coin={{ ...coin, current_price: priceForDisplay }}
              portfolio={portfolio}
              isAuthenticated={!!user}
              initialSide={initialSide}
              onTraded={async (result) => {
                if (result?.status === 'FILLED') {
                  toast.success(
                    `${result.side} filled · ${fmtNum(result.quantity, 8)} ${result.symbol} @ ${fmtUSD(result.executedPrice)}`,
                    { title: 'Order filled' }
                  );
                } else if (result) {
                  toast.info(`Order placed · ${result.status}. Will fill when triggered.`);
                }
                await loadUserData();
              }}
              onError={(msg) => toast.error(msg)}
            />
          </div>
        </aside>

        {/* CENTER — Chart */}
        <section className="lg:col-span-6 xl:col-span-6 order-1 lg:order-2 min-w-0">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <div className="flex items-center gap-1">
                {INTERVALS.map((it) => (
                  <button
                    key={it.value}
                    onClick={() => setChartInterval(it.value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider transition ${
                      chartInterval === it.value
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-white/40 font-mono">
                {tvSymbol} · TradingView
              </div>
            </div>
            <div className="h-[480px] sm:h-[560px] lg:h-[620px]">
              <TradingViewChart symbol={tvSymbol} interval={chartInterval} />
            </div>
          </div>
        </section>

        {/* RIGHT — Position + info */}
        <aside className="lg:col-span-3 xl:col-span-3 order-3 lg:order-3 space-y-3">
          <PositionCard
            coin={coin}
            holding={holding}
            mark={priceForDisplay}
            authed={!!user}
            closing={closing === coinId}
            onClose={() => holding && closePosition(holding)}
          />
          <AboutCard coin={coin} />
        </aside>
      </div>

      {/* BOTTOM TABS */}
      <div className="card mt-3 overflow-hidden">
        <div className="flex border-b border-white/5 px-2">
          <TabButton active={tab === 'positions'}     onClick={() => setTab('positions')}>
            Positions <Count n={portfolio?.holdings?.length || 0} />
          </TabButton>
          <TabButton active={tab === 'orders'}        onClick={() => setTab('orders')}>
            Open Orders <Count n={openOrders.length} />
          </TabButton>
          <TabButton active={tab === 'history'}       onClick={() => setTab('history')}>
            {coin.symbol} History <Count n={transactions.length} />
          </TabButton>
        </div>

        {!user ? (
          <div className="px-4 py-8 text-sm text-white/50 text-center">
            Sign in to see your positions, open orders and trade history.
          </div>
        ) : tab === 'positions' ? (
          <PositionsTable
            holdings={portfolio?.holdings || []}
            livePrices={positionPrices}
            currentCoinId={coinId}
            onClose={closePosition}
            closingId={closing}
          />
        ) : tab === 'orders' ? (
          <OrdersTable orders={openOrders} onCancel={cancelOrder} highlightCoinId={coinId} />
        ) : (
          <HistoryTable transactions={transactions} />
        )}
      </div>
    </div>
  );
}

/* =========================================================================
 * Subcomponents
 * ========================================================================= */

function LiveBadge({ isLive, ts }) {
  return (
    <span className={`inline-flex items-center gap-1 pill ${isLive ? 'pill-green' : 'pill-mute'}`} title={ts ? `Last tick ${new Date(ts).toLocaleTimeString()}` : ''}>
      {isLive ? <Wifi size={10} /> : <WifiOff size={10} />}
      {isLive ? 'LIVE' : 'IDLE'}
    </span>
  );
}

function Stat({ label, value, valueClass = 'text-white', big = false, flashKey }) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (flashKey == null) return undefined;
    setFlash(true);
    const id = window.setTimeout(() => setFlash(false), 600);
    return () => window.clearTimeout(id);
  }, [flashKey]);

  return (
    <div className={`leading-tight px-1.5 rounded-md ${flash ? 'tick-flash' : ''}`}>
      <div className="text-[10px] uppercase tracking-wider text-white/40 font-mono">
        {label}
      </div>
      <div className={`font-mono ${big ? 'text-lg sm:text-xl font-bold' : 'text-sm'} ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
        active
          ? 'border-accent-green text-white'
          : 'border-transparent text-white/55 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function Count({ n }) {
  return <span className="ml-1.5 text-[10px] font-mono text-white/45">({n})</span>;
}

function PositionCard({ coin, holding, mark, authed, closing, onClose }) {
  if (!authed) {
    return (
      <div className="card p-4">
        <div className="text-xs uppercase tracking-wider text-white/40 font-mono mb-2">
          Your position
        </div>
        <div className="text-sm text-white/50">Sign in to see your holdings.</div>
      </div>
    );
  }

  if (!holding) {
    return (
      <div className="card p-4">
        <div className="text-xs uppercase tracking-wider text-white/40 font-mono mb-2">
          Your position · {coin.symbol}
        </div>
        <div className="text-sm text-white/50">
          You don't hold any {coin.symbol} yet.
        </div>
      </div>
    );
  }

  const qty   = holding.quantity;
  const entry = holding.avgBuyPrice;
  const value = qty * mark;
  const pnl   = (mark - entry) * qty;
  const pnlPct = entry > 0 ? ((mark - entry) / entry) * 100 : 0;
  const positive = pnl >= 0;

  return (
    <div className="card p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-white/40 font-mono">
          Your position
        </div>
        <span className={positive ? 'pill-green' : 'pill-red'}>
          {positive ? '+' : ''}{fmtPct(pnlPct)}
        </span>
      </div>

      <PosRow k="Quantity"  v={`${fmtNum(qty, 8)} ${coin.symbol}`} />
      <PosRow k="Entry"     v={fmtUSD(entry)} />
      <PosRow k="Mark"      v={fmtUSD(mark)} />
      <PosRow k="Value"     v={fmtUSD(value)} bold />
      <PosRow
        k="Unrealized P&L"
        v={<span className={positive ? 'text-accent-green' : 'text-accent-red'}>
            {positive ? '+' : ''}{fmtUSD(pnl)}
          </span>}
        bold
      />

      {holding.openedAt && (
        <div className="text-[11px] text-white/40 font-mono flex items-center gap-1 pt-1">
          <Clock size={11} />
          Opened {formatRelativeTime(holding.openedAt)} · {new Date(holding.openedAt).toLocaleString('en-US', {
            month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
          })}
        </div>
      )}

      <button
        onClick={onClose}
        disabled={closing}
        className="btn-danger w-full mt-1"
      >
        {closing ? 'Closing…' : `Close Position (${positive ? 'TP' : 'SL'})`}
      </button>
    </div>
  );
}

function PosRow({ k, v, bold }) {
  return (
    <div className="flex items-center justify-between text-sm font-mono">
      <span className="text-white/55">{k}</span>
      <span className={bold ? 'text-white font-semibold' : 'text-white'}>{v}</span>
    </div>
  );
}

function AboutCard({ coin }) {
  if (!coin.description) return null;
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-white/40 font-mono mb-2">
        About {coin.name}
      </div>
      <p className="text-white/65 text-sm leading-relaxed">{coin.description}.</p>
    </div>
  );
}

function PositionsTable({ holdings, livePrices, currentCoinId, onClose, closingId }) {
  if (holdings.length === 0) {
    return (
      <div className="px-4 py-8 text-sm text-white/40 text-center font-mono">
        No open positions yet. Place an order from the panel on the left.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/50 font-mono">
          <tr>
            <th className="text-left  px-3 py-2">Asset</th>
            <th className="text-right px-3 py-2">Quantity</th>
            <th className="text-right px-3 py-2">Entry</th>
            <th className="text-right px-3 py-2">Mark</th>
            <th className="text-right px-3 py-2">Value</th>
            <th className="text-right px-3 py-2">PnL (Unreal.)</th>
            <th className="text-left  px-3 py-2">Opened</th>
            <th className="text-right px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {holdings.map((h) => {
            const mark = livePrices[h.coinId] ?? h.currentPrice ?? h.avgBuyPrice;
            const pnl  = (mark - h.avgBuyPrice) * h.quantity;
            const pct  = h.avgBuyPrice > 0 ? ((mark - h.avgBuyPrice) / h.avgBuyPrice) * 100 : 0;
            const positive = pnl >= 0;
            return (
              <tr
                key={h.coinId}
                className={`hover:bg-white/5 transition ${h.coinId === currentCoinId ? 'bg-white/[0.025]' : ''}`}
              >
                <td className="px-3 py-2.5">
                  <Link to={`/market/${h.coinId}`} className="flex items-center gap-2 hover:text-accent-green">
                    <span className="font-medium">{h.symbol}</span>
                    <span className="text-white/40 text-xs">{h.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtNum(h.quantity, 8)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtUSD(h.avgBuyPrice)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtUSD(mark)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmtUSD(h.quantity * mark)}</td>
                <td className={`px-3 py-2.5 text-right font-mono ${positive ? 'text-accent-green' : 'text-accent-red'}`}>
                  {positive ? '+' : ''}{fmtUSD(pnl)} <span className="text-white/40 text-xs">({fmtPct(pct)})</span>
                </td>
                <td className="px-3 py-2.5 text-left font-mono text-[11px] text-white/55">
                  {h.openedAt ? (
                    <>
                      <div>{new Date(h.openedAt).toLocaleString('en-US', {
                        month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}</div>
                      <div className="text-white/35 text-[10px]">{formatRelativeTime(h.openedAt)}</div>
                    </>
                  ) : '—'}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    onClick={() => onClose(h)}
                    disabled={closingId === h.coinId}
                    className="btn-danger text-xs px-3 py-1"
                  >
                    {closingId === h.coinId ? '…' : 'Close'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OrdersTable({ orders, onCancel, highlightCoinId }) {
  if (orders.length === 0) {
    return (
      <div className="px-4 py-8 text-sm text-white/40 text-center font-mono">
        No open orders.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/50 font-mono">
          <tr>
            <th className="text-left  px-3 py-2">Time</th>
            <th className="text-left  px-3 py-2">Asset</th>
            <th className="text-right px-3 py-2">Side</th>
            <th className="text-right px-3 py-2">Type</th>
            <th className="text-right px-3 py-2">Qty</th>
            <th className="text-right px-3 py-2">Price</th>
            <th className="text-right px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {orders.map((o) => (
            <tr key={o._id} className={`hover:bg-white/5 ${o.coinId === highlightCoinId ? 'bg-white/[0.025]' : ''}`}>
              <td className="px-3 py-2.5 text-white/60 font-mono text-[11px]">
                {new Date(o.createdAt).toLocaleString('en-US', {
                  month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                })}
              </td>
              <td className="px-3 py-2.5">
                <Link to={`/market/${o.coinId}`} className="hover:text-accent-green">
                  <span className="font-medium">{o.symbol}</span>
                  <span className="text-white/40 text-xs ml-1.5">{o.name}</span>
                </Link>
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className={o.side === 'BUY' ? 'pill-green' : 'pill-red'}>{o.side}</span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="pill-mute">{o.type}</span>
              </td>
              <td className="px-3 py-2.5 text-right font-mono">{fmtNum(o.quantity, 8)}</td>
              <td className="px-3 py-2.5 text-right font-mono">{fmtUSD(o.price)}</td>
              <td className="px-3 py-2.5 text-right">
                <button onClick={() => onCancel(o._id)} className="btn-ghost text-xs">
                  <X size={12} className="mr-1" /> Cancel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ transactions }) {
  if (transactions.length === 0) {
    return (
      <div className="px-4 py-8 text-sm text-white/40 text-center font-mono">
        No trades yet for this market.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/50 font-mono">
          <tr>
            <th className="text-left  px-3 py-2">Time</th>
            <th className="text-right px-3 py-2">Side</th>
            <th className="text-right px-3 py-2">Qty</th>
            <th className="text-right px-3 py-2">Price</th>
            <th className="text-right px-3 py-2">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {transactions.map((t) => (
            <tr key={t._id} className="hover:bg-white/5">
              <td className="px-3 py-2.5 text-white/60 font-mono text-[11px]">
                {new Date(t.createdAt).toLocaleString('en-US', {
                  month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                })}
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className={t.side === 'BUY' ? 'pill-green' : 'pill-red'}>{t.side}</span>
              </td>
              <td className="px-3 py-2.5 text-right font-mono">{fmtNum(t.quantity, 8)}</td>
              <td className="px-3 py-2.5 text-right font-mono">{fmtUSD(t.price)}</td>
              <td className="px-3 py-2.5 text-right font-mono">{fmtUSD(t.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =========================================================================
 * Helpers
 * ========================================================================= */

function formatRelativeTime(dateLike) {
  if (!dateLike) return '—';
  const d = new Date(dateLike);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'just now';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
