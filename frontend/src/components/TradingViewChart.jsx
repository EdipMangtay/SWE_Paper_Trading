// Embeds the official TradingView "Advanced Chart" widget.
// Free, full drawing tools, indicators, intervals — the same UI as tradingview.com.
//
// Robust against React 18 StrictMode double-mounting: we only rebuild the
// widget when the (symbol, interval, theme) tuple actually changes, never on
// the throwaway second mount cycle.

import { useEffect, useRef } from 'react';

export default function TradingViewChart({
  symbol = 'BINANCE:BTCUSDT',
  interval = '60',
  theme = 'dark',
  className = ''
}) {
  const hostRef     = useRef(null);
  const lastKeyRef  = useRef('');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const key = `${symbol}::${interval}::${theme}`;
    if (lastKeyRef.current === key) return; // ignore StrictMode re-fire
    lastKeyRef.current = key;

    while (host.firstChild) host.removeChild(host.firstChild);

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = '100%';
    widget.style.width  = '100%';
    host.appendChild(widget);

    const script = document.createElement('script');
    script.type   = 'text/javascript';
    script.async  = true;
    script.src    = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'Etc/UTC',
      theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      backgroundColor: 'rgba(17,24,39,1)',
      gridColor: 'rgba(255,255,255,0.05)',
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      withdateranges: true,
      save_image: false,
      details: false,
      hide_volume: false,
      studies: ['STD;EMA', 'STD;Volume'],
      support_host: 'https://www.tradingview.com'
    });
    host.appendChild(script);
  }, [symbol, interval, theme]);

  return (
    <div
      className={`tradingview-widget-container ${className}`}
      ref={hostRef}
      style={{ height: '100%', width: '100%' }}
    />
  );
}
