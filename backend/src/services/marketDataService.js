// src/services/marketDataService.js
// Pulls live prices from CoinGecko. Caches results in-memory to respect rate limits
// (CoinGecko free tier ~10-30 req/min). Falls back to a curated list if the API is down.

const axios = require('axios');
const NodeCache = require('node-cache');
const env = require('../config/env');
const logger = require('../utils/logger');

const cache = new NodeCache({ stdTTL: env.PRICE_CACHE_TTL, checkperiod: 30 });

const FALLBACK_COINS = [
  { id: 'bitcoin',  symbol: 'BTC',  name: 'Bitcoin',     current_price: 65000,  price_change_percentage_24h: 0,  image: '' },
  { id: 'ethereum', symbol: 'ETH',  name: 'Ethereum',    current_price: 3200,   price_change_percentage_24h: 0,  image: '' },
  { id: 'solana',   symbol: 'SOL',  name: 'Solana',      current_price: 145,    price_change_percentage_24h: 0,  image: '' },
  { id: 'cardano',  symbol: 'ADA',  name: 'Cardano',     current_price: 0.45,   price_change_percentage_24h: 0,  image: '' },
  { id: 'ripple',   symbol: 'XRP',  name: 'XRP',         current_price: 0.55,   price_change_percentage_24h: 0,  image: '' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin',    current_price: 0.12,   price_change_percentage_24h: 0,  image: '' },
  { id: 'polkadot', symbol: 'DOT',  name: 'Polkadot',    current_price: 6.8,    price_change_percentage_24h: 0,  image: '' },
  { id: 'chainlink',symbol: 'LINK', name: 'Chainlink',   current_price: 14,     price_change_percentage_24h: 0,  image: '' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', current_price: 28,    price_change_percentage_24h: 0,  image: '' },
  { id: 'litecoin', symbol: 'LTC',  name: 'Litecoin',    current_price: 75,     price_change_percentage_24h: 0,  image: '' }
];

const marketDataService = {
  /**
   * Top N coins by market cap, with 24h price change.
   */
  async getTopCoins(limit = 50) {
    const key = `top_${limit}`;
    const cached = cache.get(key);
    if (cached) return cached;

    try {
      const { data } = await axios.get(`${env.COINGECKO_BASE_URL}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: limit,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h'
        },
        timeout: 8000
      });
      const slim = data.map((c) => ({
        id: c.id,
        symbol: (c.symbol || '').toUpperCase(),
        name: c.name,
        image: c.image,
        current_price: c.current_price,
        market_cap: c.market_cap,
        price_change_percentage_24h: c.price_change_percentage_24h,
        total_volume: c.total_volume
      }));
      cache.set(key, slim);
      return slim;
    } catch (err) {
      logger.warn('CoinGecko getTopCoins failed, using fallback:', err.message);
      return FALLBACK_COINS.slice(0, limit);
    }
  },

  /**
   * Get current price + meta for a single coin by CoinGecko id.
   */
  async getCoin(coinId) {
    const key = `coin_${coinId}`;
    const cached = cache.get(key);
    if (cached) return cached;

    try {
      const { data } = await axios.get(`${env.COINGECKO_BASE_URL}/coins/${coinId}`, {
        params: { localization: false, tickers: false, community_data: false, developer_data: false },
        timeout: 8000
      });
      const slim = {
        id: data.id,
        symbol: (data.symbol || '').toUpperCase(),
        name: data.name,
        image: data.image?.large,
        current_price: data.market_data?.current_price?.usd,
        market_cap: data.market_data?.market_cap?.usd,
        price_change_percentage_24h: data.market_data?.price_change_percentage_24h,
        price_change_percentage_7d:  data.market_data?.price_change_percentage_7d,
        price_change_percentage_30d: data.market_data?.price_change_percentage_30d,
        description: data.description?.en?.split('. ')[0] || ''
      };
      cache.set(key, slim);
      return slim;
    } catch (err) {
      logger.warn(`CoinGecko getCoin(${coinId}) failed:`, err.message);
      const fb = FALLBACK_COINS.find((c) => c.id === coinId);
      if (fb) return fb;
      const e = new Error('Coin not found'); e.status = 404; throw e;
    }
  },

  /**
   * Historical chart data for sparkline / price chart. Days = 1, 7, 30.
   */
  async getHistory(coinId, days = 7) {
    const key = `history_${coinId}_${days}`;
    const cached = cache.get(key);
    if (cached) return cached;

    try {
      const { data } = await axios.get(`${env.COINGECKO_BASE_URL}/coins/${coinId}/market_chart`, {
        params: { vs_currency: 'usd', days },
        timeout: 8000
      });
      // data.prices is [[timestampMs, price], ...]
      const slim = data.prices.map(([t, p]) => ({ time: t, price: p }));
      cache.set(key, slim, 300); // longer TTL for historical
      return slim;
    } catch (err) {
      logger.warn(`CoinGecko getHistory(${coinId}) failed:`, err.message);
      // Fabricate a flat line so the UI still renders
      const now = Date.now();
      const fb = FALLBACK_COINS.find((c) => c.id === coinId);
      const base = fb?.current_price || 100;
      const points = 50;
      return Array.from({ length: points }).map((_, i) => ({
        time: now - (points - i) * 60_000,
        price: base
      }));
    }
  },

  /**
   * Returns map { coinId: priceUsd } for the given ids.
   * Used by orderService and portfolioService for valuation.
   */
  async getPriceMap(coinIds) {
    if (!coinIds.length) return {};
    const key = `priceMap_${coinIds.sort().join(',')}`;
    const cached = cache.get(key);
    if (cached) return cached;

    try {
      const { data } = await axios.get(`${env.COINGECKO_BASE_URL}/simple/price`, {
        params: { ids: coinIds.join(','), vs_currencies: 'usd' },
        timeout: 8000
      });
      const map = {};
      for (const id of coinIds) map[id] = data[id]?.usd ?? null;
      cache.set(key, map, 30);
      return map;
    } catch (err) {
      logger.warn('CoinGecko getPriceMap failed, using fallback:', err.message);
      const map = {};
      for (const id of coinIds) {
        const fb = FALLBACK_COINS.find((c) => c.id === id);
        map[id] = fb?.current_price ?? null;
      }
      return map;
    }
  },

  /**
   * Search coins by free-text. Hits CoinGecko's /search endpoint.
   */
  async searchCoins(query) {
    if (!query || query.length < 2) return [];
    const key = `search_${query.toLowerCase()}`;
    const cached = cache.get(key);
    if (cached) return cached;

    try {
      const { data } = await axios.get(`${env.COINGECKO_BASE_URL}/search`, {
        params: { query },
        timeout: 8000
      });
      const slim = (data.coins || []).slice(0, 15).map((c) => ({
        id: c.id,
        symbol: (c.symbol || '').toUpperCase(),
        name: c.name,
        image: c.thumb,
        market_cap_rank: c.market_cap_rank
      }));
      cache.set(key, slim, 120);
      return slim;
    } catch (err) {
      logger.warn('CoinGecko searchCoins failed:', err.message);
      return FALLBACK_COINS
        .filter((c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.symbol.toLowerCase().includes(query.toLowerCase())
        );
    }
  }
};

module.exports = marketDataService;
