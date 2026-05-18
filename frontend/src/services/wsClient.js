// Thin WebSocket client + React hook for live coin prices.
//
// One persistent connection per browser tab. Components subscribe to one or
// more coinIds and receive { price, ts } updates. Auto-reconnects on close.

import { useEffect, useRef, useState } from 'react';

const WS_PATH = '/ws';

function buildWsUrl() {
  if (typeof window === 'undefined') return null;
  const { protocol, host } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProto}//${host}${WS_PATH}`;
}

class PriceStreamClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.listeners = new Set();
    this.subscriptions = new Map(); // coinId -> refcount
    this.lastPrices = {};
  }

  connect() {
    if (this.ws) return;
    const url = buildWsUrl();
    if (!url) return;
    try {
      this.ws = new WebSocket(url);
    } catch {
      this._scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempt = 0;
      const ids = Array.from(this.subscriptions.keys());
      if (ids.length) this._send({ action: 'subscribe', coinIds: ids });
    };
    this.ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg?.type === 'prices' && msg.prices) {
        this.lastPrices = { ...this.lastPrices, ...msg.prices };
        for (const fn of this.listeners) {
          try { fn(msg.prices, msg.ts || Date.now()); } catch { /* ignore */ }
        }
      }
    };
    this.ws.onclose = () => {
      this.connected = false;
      this.ws = null;
      this._scheduleReconnect();
    };
    this.ws.onerror = () => { /* let onclose handle reconnect */ };
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(15_000, 1_000 * Math.pow(2, this.reconnectAttempt));
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  _send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try { this.ws.send(JSON.stringify(message)); } catch { /* ignore */ }
  }

  subscribe(coinIds) {
    const fresh = [];
    for (const id of coinIds) {
      const next = (this.subscriptions.get(id) || 0) + 1;
      this.subscriptions.set(id, next);
      if (next === 1) fresh.push(id);
    }
    if (fresh.length) this._send({ action: 'subscribe', coinIds: fresh });
  }

  unsubscribe(coinIds) {
    const drop = [];
    for (const id of coinIds) {
      const cur = this.subscriptions.get(id) || 0;
      if (cur <= 1) { this.subscriptions.delete(id); drop.push(id); }
      else this.subscriptions.set(id, cur - 1);
    }
    if (drop.length) this._send({ action: 'unsubscribe', coinIds: drop });
  }

  addListener(fn) { this.listeners.add(fn); }
  removeListener(fn) { this.listeners.delete(fn); }
}

const client = new PriceStreamClient();
if (typeof window !== 'undefined') client.connect();

/**
 * useLivePrice(coinId)
 *   returns { price, ts, isLive } — price updates ~ every 10s while connected.
 *   Falls back to `initialPrice` until the first WS tick arrives.
 */
export function useLivePrice(coinId, initialPrice = null) {
  const [state, setState] = useState({
    price: initialPrice,
    ts: null,
    isLive: false
  });
  const lastInitial = useRef(initialPrice);

  useEffect(() => {
    if (initialPrice != null && lastInitial.current !== initialPrice) {
      lastInitial.current = initialPrice;
      setState((s) => (s.isLive ? s : { ...s, price: initialPrice }));
    }
  }, [initialPrice]);

  useEffect(() => {
    if (!coinId) return undefined;
    client.subscribe([coinId]);
    const handler = (prices, ts) => {
      if (prices[coinId] != null) {
        setState({ price: prices[coinId], ts, isLive: true });
      }
    };
    client.addListener(handler);
    if (client.lastPrices[coinId] != null) {
      setState({ price: client.lastPrices[coinId], ts: Date.now(), isLive: true });
    }
    return () => {
      client.removeListener(handler);
      client.unsubscribe([coinId]);
    };
  }, [coinId]);

  return state;
}

/**
 * useLivePrices(coinIds[])
 *   returns { prices: { [coinId]: number }, ts }
 */
export function useLivePrices(coinIds) {
  const [state, setState] = useState({ prices: {}, ts: null });
  const idsKey = (coinIds || []).join(',');

  useEffect(() => {
    if (!coinIds || coinIds.length === 0) return undefined;
    const fresh = [...coinIds];
    client.subscribe(fresh);
    const handler = (prices, ts) => {
      const matched = {};
      let any = false;
      for (const id of fresh) {
        if (prices[id] != null) { matched[id] = prices[id]; any = true; }
      }
      if (any) setState((s) => ({ prices: { ...s.prices, ...matched }, ts }));
    };
    client.addListener(handler);
    const initial = {};
    let any = false;
    for (const id of fresh) {
      if (client.lastPrices[id] != null) { initial[id] = client.lastPrices[id]; any = true; }
    }
    if (any) setState((s) => ({ prices: { ...s.prices, ...initial }, ts: Date.now() }));
    return () => {
      client.removeListener(handler);
      client.unsubscribe(fresh);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return state;
}

export default client;
