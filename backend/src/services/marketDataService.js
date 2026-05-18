// src/services/marketDataService.js
// Two-source price strategy for accuracy + resilience:
//   1) PRIMARY     : Binance public REST  -> live prices, 24h change
//                    (same source as the TradingView chart, so prices match)
//   2) METADATA    : CoinGecko             -> image, description, 7d/30d %
// CoinGecko free tier often rate-limits cloud IPs (Railway, Vercel, etc.).
// Falling back to Binance for prices avoids the stale "fallback" prices the
// app used to show when CoinGecko blocked us.

const axios = require('axios');
const NodeCache = require('node-cache');
const env = require('../config/env');
const logger = require('../utils/logger');
const { coinIdToBinanceSymbol } = require('../utils/binanceSymbol');

const cache = new NodeCache({ stdTTL: env.PRICE_CACHE_TTL, checkperiod: 30 });
// CoinGecko meta (image, description, 7d/30d %) changes slowly — long cache.
const metaCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const BINANCE_BASE = 'https://api.binance.com/api/v3';

// Last-known good prices so transient Binance hiccups don't leave us empty.
const lastKnownPrice = new Map(); // symbol -> { lastPrice, priceChangePercent, quoteVolume, ts }

// Curated top-50 list (CoinGecko ids + symbols). Used when CoinGecko's /markets
// endpoint is unavailable. Names/images stay reasonable; prices are filled
// in live from Binance.
const TOP_50 = [
  { id: 'bitcoin',           symbol: 'BTC',   name: 'Bitcoin',         image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
  { id: 'ethereum',          symbol: 'ETH',   name: 'Ethereum',        image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
  { id: 'tether',            symbol: 'USDT',  name: 'Tether',          image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png' },
  { id: 'binancecoin',       symbol: 'BNB',   name: 'BNB',             image: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png' },
  { id: 'solana',            symbol: 'SOL',   name: 'Solana',          image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
  { id: 'usd-coin',          symbol: 'USDC',  name: 'USD Coin',        image: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png' },
  { id: 'ripple',            symbol: 'XRP',   name: 'XRP',             image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
  { id: 'dogecoin',          symbol: 'DOGE',  name: 'Dogecoin',        image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
  { id: 'cardano',           symbol: 'ADA',   name: 'Cardano',         image: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
  { id: 'tron',              symbol: 'TRX',   name: 'TRON',            image: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png' },
  { id: 'avalanche-2',       symbol: 'AVAX',  name: 'Avalanche',       image: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png' },
  { id: 'chainlink',         symbol: 'LINK',  name: 'Chainlink',       image: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png' },
  { id: 'polkadot',          symbol: 'DOT',   name: 'Polkadot',        image: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png' },
  { id: 'matic-network',     symbol: 'MATIC', name: 'Polygon',         image: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png' },
  { id: 'shiba-inu',         symbol: 'SHIB',  name: 'Shiba Inu',       image: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png' },
  { id: 'litecoin',          symbol: 'LTC',   name: 'Litecoin',        image: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png' },
  { id: 'bitcoin-cash',      symbol: 'BCH',   name: 'Bitcoin Cash',    image: 'https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png' },
  { id: 'uniswap',           symbol: 'UNI',   name: 'Uniswap',         image: 'https://assets.coingecko.com/coins/images/12504/large/uniswap-logo.png' },
  { id: 'stellar',           symbol: 'XLM',   name: 'Stellar',         image: 'https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png' },
  { id: 'cosmos',            symbol: 'ATOM',  name: 'Cosmos',          image: 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png' },
  { id: 'monero',            symbol: 'XMR',   name: 'Monero',          image: 'https://assets.coingecko.com/coins/images/69/large/monero_logo.png' },
  { id: 'aptos',             symbol: 'APT',   name: 'Aptos',           image: 'https://assets.coingecko.com/coins/images/26455/large/aptos_round.png' },
  { id: 'arbitrum',          symbol: 'ARB',   name: 'Arbitrum',        image: 'https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg' },
  { id: 'optimism',          symbol: 'OP',    name: 'Optimism',        image: 'https://assets.coingecko.com/coins/images/25244/large/Optimism.png' },
  { id: 'filecoin',          symbol: 'FIL',   name: 'Filecoin',        image: 'https://assets.coingecko.com/coins/images/12817/large/filecoin.png' },
  { id: 'near',              symbol: 'NEAR',  name: 'NEAR Protocol',   image: 'https://assets.coingecko.com/coins/images/10365/large/near.jpg' },
  { id: 'internet-computer', symbol: 'ICP',   name: 'Internet Computer', image: 'https://assets.coingecko.com/coins/images/14495/large/Internet_Computer_logo.png' },
  { id: 'algorand',          symbol: 'ALGO',  name: 'Algorand',        image: 'https://assets.coingecko.com/coins/images/4380/large/download.png' },
  { id: 'vechain',           symbol: 'VET',   name: 'VeChain',         image: 'https://assets.coingecko.com/coins/images/1167/large/VeChain-Logo-768x725.png' },
  { id: 'hedera-hashgraph',  symbol: 'HBAR',  name: 'Hedera',          image: 'https://assets.coingecko.com/coins/images/3688/large/hbar.png' },
  { id: 'aave',              symbol: 'AAVE',  name: 'Aave',            image: 'https://assets.coingecko.com/coins/images/12645/large/AAVE.png' },
  { id: 'maker',             symbol: 'MKR',   name: 'Maker',           image: 'https://assets.coingecko.com/coins/images/1364/large/Mark_Maker.png' },
  { id: 'the-graph',         symbol: 'GRT',   name: 'The Graph',       image: 'https://assets.coingecko.com/coins/images/13397/large/Graph_Token.png' },
  { id: 'sui',               symbol: 'SUI',   name: 'Sui',             image: 'https://assets.coingecko.com/coins/images/26375/large/sui_asset.jpeg' },
  { id: 'injective',         symbol: 'INJ',   name: 'Injective',       image: 'https://assets.coingecko.com/coins/images/12882/large/Secondary_Symbol.png' },
  { id: 'render',            symbol: 'RNDR',  name: 'Render',          image: 'https://assets.coingecko.com/coins/images/11636/large/rndr.png' },
  { id: 'fantom',            symbol: 'FTM',   name: 'Fantom',          image: 'https://assets.coingecko.com/coins/images/4001/large/Fantom_round.png' },
  { id: 'ethereum-classic',  symbol: 'ETC',   name: 'Ethereum Classic',image: 'https://assets.coingecko.com/coins/images/453/large/ethereum-classic-logo.png' },
  { id: 'pepe',              symbol: 'PEPE',  name: 'Pepe',            image: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg' },
  { id: 'bonk',              symbol: 'BONK',  name: 'Bonk',            image: 'https://assets.coingecko.com/coins/images/28600/large/bonk.jpg' },
  { id: 'pancakeswap',       symbol: 'CAKE',  name: 'PancakeSwap',     image: 'https://assets.coingecko.com/coins/images/12632/large/pancakeswap-cake-logo_%281%29.png' },
  { id: 'curve-dao-token',   symbol: 'CRV',   name: 'Curve DAO',       image: 'https://assets.coingecko.com/coins/images/12124/large/Curve.png' },
  { id: 'lido-dao',          symbol: 'LDO',   name: 'Lido DAO',        image: 'https://assets.coingecko.com/coins/images/13573/large/Lido_DAO.png' },
  { id: 'worldcoin-wld',     symbol: 'WLD',   name: 'Worldcoin',       image: 'https://assets.coingecko.com/coins/images/31069/large/worldcoin.jpeg' },
  { id: 'the-sandbox',       symbol: 'SAND',  name: 'The Sandbox',     image: 'https://assets.coingecko.com/coins/images/12129/large/sandbox_logo.jpg' },
  { id: 'decentraland',      symbol: 'MANA',  name: 'Decentraland',    image: 'https://assets.coingecko.com/coins/images/878/large/decentraland-mana.png' },
  { id: 'axie-infinity',     symbol: 'AXS',   name: 'Axie Infinity',   image: 'https://assets.coingecko.com/coins/images/13029/large/axie_infinity_logo.png' },
  { id: 'dai',               symbol: 'DAI',   name: 'Dai',             image: 'https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png' },
  { id: 'tezos',             symbol: 'XTZ',   name: 'Tezos',           image: 'https://assets.coingecko.com/coins/images/976/large/Tezos-logo.png' },
  { id: 'eos',               symbol: 'EOS',   name: 'EOS',             image: 'https://assets.coingecko.com/coins/images/738/large/eos-eos-logo.png' }
];

/* =========================================================================
 * Binance helpers (the trusted live source)
 *
 * Resilience strategy:
 *   1. Try the batch request for exactly the symbols we want.
 *   2. If it fails (rate limit, one invalid symbol blowing up the batch, etc.)
 *      fall back to a single "all spot symbols" request that's cached for 30 s
 *      and filter down to the symbols we wanted.
 *   3. As a final cushion keep the last successful value for each symbol so a
 *      transient hiccup never empties the UI.
 * =======================================================================*/

function rememberTicker(t) {
  if (!t || !t.symbol) return;
  lastKnownPrice.set(t.symbol, {
    lastPrice: parseFloat(t.lastPrice ?? t.price ?? 0),
    priceChangePercent: parseFloat(t.priceChangePercent ?? 0),
    quoteVolume: parseFloat(t.quoteVolume ?? 0),
    ts: Date.now()
  });
}

async function fetchAllTickers24h() {
  const cached = cache.get('binance_all_24hr');
  if (cached) return cached;
  try {
    const { data } = await axios.get(`${BINANCE_BASE}/ticker/24hr`, { timeout: 9000 });
    const arr = Array.isArray(data) ? data : [];
    const map = new Map();
    for (const t of arr) {
      if (t && t.symbol) {
        map.set(t.symbol, t);
        rememberTicker(t);
      }
    }
    cache.set('binance_all_24hr', map, 30);
    return map;
  } catch (err) {
    logger.warn(`Binance all-24hr fallback failed: ${err.message}`);
    return new Map();
  }
}

async function fetchAllPrices() {
  const cached = cache.get('binance_all_prices');
  if (cached) return cached;
  try {
    const { data } = await axios.get(`${BINANCE_BASE}/ticker/price`, { timeout: 9000 });
    const arr = Array.isArray(data) ? data : [];
    const map = new Map();
    for (const p of arr) if (p && p.symbol) map.set(p.symbol, parseFloat(p.price));
    cache.set('binance_all_prices', map, 30);
    return map;
  } catch (err) {
    logger.warn(`Binance all-prices fallback failed: ${err.message}`);
    return new Map();
  }
}

async function binance24hr(symbols) {
  if (!symbols.length) return [];
  try {
    const params = symbols.length === 1
      ? { symbol: symbols[0] }
      : { symbols: JSON.stringify(symbols) };
    const { data } = await axios.get(`${BINANCE_BASE}/ticker/24hr`, { params, timeout: 7000 });
    const out = Array.isArray(data) ? data : [data];
    for (const t of out) rememberTicker(t);
    return out;
  } catch (err) {
    logger.warn(`Binance 24hr batch failed (${symbols.length} symbols): ${err.message} — trying all-tickers fallback`);
    const all = await fetchAllTickers24h();
    const out = [];
    for (const sym of symbols) {
      if (all.has(sym)) out.push(all.get(sym));
      else if (lastKnownPrice.has(sym)) {
        const k = lastKnownPrice.get(sym);
        out.push({
          symbol: sym,
          lastPrice: String(k.lastPrice),
          priceChangePercent: String(k.priceChangePercent),
          quoteVolume: String(k.quoteVolume)
        });
      }
    }
    return out;
  }
}

async function binancePrices(symbols) {
  if (!symbols.length) return {};
  try {
    const params = symbols.length === 1
      ? { symbol: symbols[0] }
      : { symbols: JSON.stringify(symbols) };
    const { data } = await axios.get(`${BINANCE_BASE}/ticker/price`, { params, timeout: 7000 });
    const arr = Array.isArray(data) ? data : [data];
    const out = {};
    for (const row of arr) {
      out[row.symbol] = parseFloat(row.price);
      // Keep tickers cache informed of fresh prices so the 24h fallback stays warm.
      const existing = lastKnownPrice.get(row.symbol);
      lastKnownPrice.set(row.symbol, {
        lastPrice: parseFloat(row.price),
        priceChangePercent: existing?.priceChangePercent ?? 0,
        quoteVolume: existing?.quoteVolume ?? 0,
        ts: Date.now()
      });
    }
    return out;
  } catch (err) {
    logger.warn(`Binance price batch failed (${symbols.length} symbols): ${err.message} — trying all-prices fallback`);
    const all = await fetchAllPrices();
    const out = {};
    for (const sym of symbols) {
      if (all.has(sym)) out[sym] = all.get(sym);
      else if (lastKnownPrice.has(sym)) out[sym] = lastKnownPrice.get(sym).lastPrice;
    }
    return out;
  }
}

/* =========================================================================
 * CoinGecko price fallback (kicks in when Binance is unreachable/blocked,
 * e.g. from cloud-provider IPs that Binance geo-restricts).
 *
 * Returns { coinId: { price, pct24, volume24 } } for the requested ids.
 * Batches as many ids as CoinGecko allows in a single request and caches
 * aggressively because the free tier is rate-limited.
 * =======================================================================*/

async function geckoSimplePrice(coinIds) {
  if (!coinIds.length) return {};
  const ids = [...new Set(coinIds)].filter(Boolean).sort();
  const key = `cg_simple_${ids.join(',')}`;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const { data } = await axios.get(`${env.COINGECKO_BASE_URL}/simple/price`, {
      params: {
        ids: ids.join(','),
        vs_currencies: 'usd',
        include_24hr_change: 'true',
        include_24hr_vol: 'true'
      },
      timeout: 8000
    });
    const out = {};
    for (const id of ids) {
      const row = data?.[id];
      if (row && typeof row.usd === 'number') {
        out[id] = {
          price: row.usd,
          pct24: row.usd_24h_change ?? 0,
          volume24: row.usd_24h_vol ?? null
        };
      }
    }
    cache.set(key, out, 30);
    return out;
  } catch (err) {
    logger.warn(`CoinGecko simple/price failed (${ids.length} ids): ${err.message}`);
    // Cache the empty result briefly to avoid hammering when rate-limited.
    cache.set(key, {}, 15);
    return {};
  }
}

/* =========================================================================
 * CoinGecko meta enrichment (best-effort, non-blocking)
 * =======================================================================*/

async function geckoCoin(coinId) {
  const cached = metaCache.get(`meta_${coinId}`);
  if (cached) return cached;
  try {
    const { data } = await axios.get(`${env.COINGECKO_BASE_URL}/coins/${coinId}`, {
      params: { localization: false, tickers: false, community_data: false, developer_data: false, sparkline: false },
      timeout: 6000
    });
    const out = {
      image: data.image?.large || null,
      description: (data.description?.en || '').split('. ')[0] || '',
      market_cap: data.market_data?.market_cap?.usd ?? null,
      price_change_percentage_7d:  data.market_data?.price_change_percentage_7d ?? null,
      price_change_percentage_30d: data.market_data?.price_change_percentage_30d ?? null
    };
    metaCache.set(`meta_${coinId}`, out);
    return out;
  } catch (err) {
    // CoinGecko free tier rate-limits cloud IPs. Cache an empty result briefly so
    // we don't hammer them on every page reload.
    metaCache.set(`meta_${coinId}`, {}, 60);
    return {};
  }
}

/* =========================================================================
 * Public API
 * =======================================================================*/

const marketDataService = {
  /**
   * Top N coins by curated rank, prices live from Binance, 24h % from Binance.
   */
  async getTopCoins(limit = 50) {
    const key = `top_${limit}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const slice = TOP_50.slice(0, limit);
    const symbols = slice
      .map((c) => coinIdToBinanceSymbol(c.id, c.symbol))
      .filter(Boolean);

    const tickers = await binance24hr(symbols);
    const tMap = new Map(tickers.map((t) => [t.symbol, t]));

    // Detect which coins didn't get a real Binance ticker — usually because
    // Binance geo-blocks the egress IP (Railway, Vercel, etc.). For those,
    // fall back to CoinGecko's /simple/price endpoint in one batch call.
    const missing = slice.filter((c) => {
      const isStable = c.id === 'tether' || c.id === 'usd-coin' || c.id === 'dai';
      if (isStable) return false;
      const bSym = coinIdToBinanceSymbol(c.id, c.symbol);
      return !bSym || !tMap.has(bSym);
    });
    let cgPrices = {};
    if (missing.length) {
      cgPrices = await geckoSimplePrice(missing.map((c) => c.id));
    }

    const out = slice.map((c) => {
      const bSym = coinIdToBinanceSymbol(c.id, c.symbol);
      const t = bSym ? tMap.get(bSym) : null;
      const isStable = c.id === 'tether' || c.id === 'usd-coin' || c.id === 'dai';

      let price, pct24, vol;
      if (t) {
        price = parseFloat(t.lastPrice);
        pct24 = parseFloat(t.priceChangePercent);
        vol   = parseFloat(t.quoteVolume);
      } else if (isStable) {
        price = 1;
        pct24 = 0;
        vol   = null;
      } else if (cgPrices[c.id]) {
        const g = cgPrices[c.id];
        price = g.price;
        pct24 = g.pct24;
        vol   = g.volume24;
      } else {
        price = null;
        pct24 = 0;
        vol   = null;
      }

      return {
        id: c.id,
        symbol: c.symbol,
        name: c.name,
        image: c.image,
        current_price: price,
        price_change_percentage_24h: pct24,
        total_volume: vol,
        market_cap: null
      };
    });

    // Shorter cache when we couldn't fetch real prices for most coins; longer
    // cache when the data looks healthy.
    const healthy = out.filter((c) => c.current_price != null).length;
    cache.set(key, out, healthy >= out.length / 2 ? 30 : 8);
    return out;
  },

  /**
   * Single-coin detail: live price + 24h from Binance, meta from CoinGecko.
   */
  async getCoin(coinId) {
    const key = `coin_${coinId}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const curated = TOP_50.find((c) => c.id === coinId);
    const symbolGuess = curated?.symbol || '';
    const bSymbol = coinIdToBinanceSymbol(coinId, symbolGuess);

    const [tickers, meta] = await Promise.all([
      bSymbol ? binance24hr([bSymbol]) : Promise.resolve([]),
      geckoCoin(coinId)
    ]);
    const t = tickers[0];

    const isStable = coinId === 'tether' || coinId === 'usd-coin' || coinId === 'dai';
    let price = t ? parseFloat(t.lastPrice) : (isStable ? 1 : null);
    let pct24 = t ? parseFloat(t.priceChangePercent) : 0;
    let vol   = t ? parseFloat(t.quoteVolume) : null;

    // CoinGecko fallback when Binance didn't give us a live price.
    if (price == null) {
      const cg = await geckoSimplePrice([coinId]);
      if (cg[coinId]) {
        price = cg[coinId].price;
        pct24 = cg[coinId].pct24;
        vol   = cg[coinId].volume24;
      }
    }

    const result = {
      id: coinId,
      symbol: (curated?.symbol || coinId).toUpperCase(),
      name: curated?.name || coinId,
      image: meta.image || curated?.image || null,
      current_price: price,
      market_cap: meta.market_cap ?? null,
      price_change_percentage_24h: pct24,
      price_change_percentage_7d:  meta.price_change_percentage_7d ?? null,
      price_change_percentage_30d: meta.price_change_percentage_30d ?? null,
      total_volume: vol,
      description: meta.description || ''
    };

    // Only cache successful prices. Caching null/invalid prices caused trading
    // endpoints to keep returning "Live price unavailable" while the UI still
    // showed a mark from WebSocket or a parallel fresh fetch.
    if (price != null && !Number.isNaN(price) && price > 0) {
      cache.set(key, result, 30);
    }
    return result;
  },

  /**
   * Historical chart. Binance klines are the most accurate match for the
   * TradingView widget. Falls back to a flat-line synthetic series.
   */
  async getHistory(coinId, days = 7) {
    const key = `history_${coinId}_${days}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const curated = TOP_50.find((c) => c.id === coinId);
    const bSym = coinIdToBinanceSymbol(coinId, curated?.symbol || '');
    if (!bSym) return [];

    // Pick a sensible interval so we return ~120-200 points
    const interval = days <= 1 ? '15m'
                   : days <= 7 ? '1h'
                   : days <= 30 ? '4h'
                   : '1d';

    try {
      const { data } = await axios.get(`${BINANCE_BASE}/klines`, {
        params: { symbol: bSym, interval, limit: 500 },
        timeout: 7000
      });
      const slim = data.map((k) => ({ time: k[0], price: parseFloat(k[4]) }));
      cache.set(key, slim, 300);
      return slim;
    } catch (err) {
      logger.warn(`Binance klines failed (${bSym}): ${err.message}`);
      return [];
    }
  },

  /**
   * Bulk live prices, used by the WebSocket streamer and the limit-order worker.
   * Returns map { coinId: priceUsd }.
   * @param {{ forStream?: boolean }} [opts]  forStream=true skips read/write cache so each poll can refresh (e.g. every 5s).
   */
  async getPriceMap(coinIds, opts = {}) {
    if (!coinIds.length) return {};
    const forStream = opts.forStream === true;
    const key = `priceMap_${[...coinIds].sort().join(',')}`;
    if (!forStream) {
      const cached = cache.get(key);
      if (cached) return cached;
    }

    const pairs = coinIds.map((id) => {
      const meta = TOP_50.find((c) => c.id === id);
      return { id, sym: coinIdToBinanceSymbol(id, meta?.symbol || '') };
    });
    const symbols = pairs.map((p) => p.sym).filter(Boolean);
    const priceBySymbol = await binancePrices(symbols);

    const map = {};
    const missing = [];
    for (const p of pairs) {
      if (p.id === 'tether' || p.id === 'usd-coin' || p.id === 'dai') {
        map[p.id] = priceBySymbol[p.sym] || 1;
        continue;
      }
      const bPrice = priceBySymbol[p.sym];
      if (bPrice != null && !Number.isNaN(bPrice)) {
        map[p.id] = bPrice;
      } else {
        missing.push(p.id);
      }
    }

    // CoinGecko fallback for any coinId Binance didn't price (typically the
    // case when running on a cloud IP Binance geo-blocks).
    if (missing.length) {
      const cg = await geckoSimplePrice(missing);
      for (const id of missing) {
        if (cg[id] && typeof cg[id].price === 'number') map[id] = cg[id].price;
        else map[id] = null;
      }
    }

    // Short cache when most prices are missing, longer when healthy.
    // WebSocket polls frequently; do not cache those reads so ticks stay fresh.
    if (!forStream) {
      const healthy = Object.values(map).filter((v) => v != null).length;
      cache.set(key, map, healthy >= pairs.length / 2 ? 12 : 5);
    }
    return map;
  },

  /**
   * Search across the curated TOP_50 list. (CoinGecko search is still attempted
   * for unknown queries; if it fails, we just return the curated subset.)
   */
  async searchCoins(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const curatedMatches = TOP_50
      .filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
      .slice(0, 15)
      .map((c) => ({ id: c.id, symbol: c.symbol, name: c.name, image: c.image, market_cap_rank: null }));

    if (curatedMatches.length >= 5) return curatedMatches;

    try {
      const { data } = await axios.get(`${env.COINGECKO_BASE_URL}/search`, {
        params: { query }, timeout: 5000
      });
      const fromGecko = (data.coins || []).slice(0, 15).map((c) => ({
        id: c.id, symbol: (c.symbol || '').toUpperCase(), name: c.name,
        image: c.thumb, market_cap_rank: c.market_cap_rank
      }));
      const seen = new Set(curatedMatches.map((c) => c.id));
      return [...curatedMatches, ...fromGecko.filter((c) => !seen.has(c.id))].slice(0, 15);
    } catch (_) {
      return curatedMatches;
    }
  }
};

module.exports = marketDataService;
