// src/services/orderService.js
// Heart of the trading engine. Validates orders, mutates the user's cash balance
// and portfolio, and creates immutable Transaction records on fill.
//
// Order lifecycle (matches the SAD state machine):
//   MARKET BUY/SELL  -> validated -> executed at live price -> FILLED
//   LIMIT  BUY/SELL  -> validated -> stored as PENDING -> matched async
//   PENDING          -> CANCELLED  (user)
//   PENDING          -> EXPIRED    (TTL passed)
//
// Note on race conditions: For an academic project we use sequential awaits.
// In production this would need transactions / row locks.

const orderRepository       = require('../repositories/orderRepository');
const portfolioRepository   = require('../repositories/portfolioRepository');
const userRepository        = require('../repositories/userRepository');
const transactionRepository = require('../repositories/transactionRepository');
const marketDataService     = require('./marketDataService');
const logger                = require('../utils/logger');
const {
  EPS, round2, round8, normalizeAsset, hasExposure, pruneEmptyAssets, defaultCloseSide
} = require('../utils/positionMath');

function httpError(status, message) {
  const e = new Error(message); e.status = status; return e;
}

/** Use REST price paths for execution; may supplement getCoin when cache missed. */
async function resolveLiveUsdPrice(coinId, coin) {
  let p = coin?.current_price;
  if (p != null && !Number.isNaN(p) && p > 0) return p;
  const pm = await marketDataService.getPriceMap([coinId]);
  p = pm[coinId];
  if (p != null && !Number.isNaN(p) && p > 0) return p;
  return null;
}

const orderService = {
  /**
   * Create + (when MARKET) immediately execute an order.
   * @param {String} userId
   * @param {Object} input { coinId, type: 'MARKET'|'LIMIT', side: 'BUY'|'SELL', quantity, price?, expiresAt? }
   */
  async createOrder(userId, input) {
    const { coinId, type, side, quantity } = input;
    if (!coinId || !type || !side || !quantity) {
      throw httpError(400, 'coinId, type, side, quantity are required');
    }
    if (quantity <= 0) throw httpError(400, 'quantity must be positive');
    if (!['MARKET', 'LIMIT'].includes(type)) throw httpError(400, 'invalid type');
    if (!['BUY', 'SELL'].includes(side)) throw httpError(400, 'invalid side');
    if (type === 'LIMIT' && !(input.price > 0)) {
      throw httpError(400, 'LIMIT orders require a positive price');
    }

    const coin = await marketDataService.getCoin(coinId);
    const livePrice = await resolveLiveUsdPrice(coinId, coin);
    if (!livePrice) throw httpError(503, 'Live price unavailable');

    const order = await orderRepository.create({
      user: userId,
      symbol: coin.symbol,
      coinId: coin.id,
      name: coin.name,
      type,
      side,
      quantity,
      price: type === 'MARKET' ? livePrice : input.price,
      status: 'PENDING',
      expiresAt: input.expiresAt || null
    });

    if (type === 'MARKET') {
      return await orderService._executeOrder(order, livePrice);
    }

    // LIMIT: maybe it's already in the money on creation
    if (orderService._shouldFill(side, input.price, livePrice)) {
      return await orderService._executeOrder(order, livePrice);
    }

    return order;
  },

  /**
   * Decides whether a limit order should fire given the current price.
   *  - BUY  fills when market <= limit (price dropped enough)
   *  - SELL fills when market >= limit (price rose enough)
   */
  _shouldFill(side, limitPrice, marketPrice) {
    if (side === 'BUY')  return marketPrice <= limitPrice;
    if (side === 'SELL') return marketPrice >= limitPrice;
    return false;
  },

  /**
   * Apply the trade: move cash, update portfolio holdings,
   * write Transaction, mark order FILLED.
   */
  async _executeOrder(order, executedPrice) {
    const user = await userRepository.findById(order.user);
    if (!user) throw httpError(404, 'User not found');

    const portfolio = await portfolioRepository.findOrCreate(user._id);
    const total = order.quantity * executedPrice;

    if (order.side === 'BUY') {
      if (user.cashBalance < total - 0.001) {
        await orderRepository.updateStatus(order._id, {
          status: 'CANCELLED',
          cancelledAt: new Date()
        });
        const idx = portfolio.assets.findIndex((a) => a.coinId === order.coinId);
        const shortOpen = idx >= 0 ? (portfolio.assets[idx].shortQuantity || 0) : 0;
        const coveringShort = shortOpen > EPS && order.quantity <= shortOpen + EPS;
        throw httpError(
          400,
          coveringShort
            ? 'Insufficient cash to cover short position'
            : 'Insufficient cash balance'
        );
      }
      // Decrement cash
      user.cashBalance = round2(user.cashBalance - total);
      await user.save();

      // Cover shorts first, then add / average into long.
      const idx = portfolio.assets.findIndex((a) => a.coinId === order.coinId);
      const now = new Date();
      let remaining = order.quantity;

      if (idx === -1) {
        portfolio.assets.push({
          symbol: order.symbol,
          coinId: order.coinId,
          name: order.name,
          quantity: order.quantity,
          avgBuyPrice: executedPrice,
          shortQuantity: 0,
          avgShortPrice: 0,
          openedAt: now,
          lastTradeAt: now
        });
      } else {
        const existing = portfolio.assets[idx];
        const longQty = existing.quantity || 0;
        const shortQty = existing.shortQuantity || 0;

        const cover = Math.min(remaining, shortQty);
        if (cover > 0) {
          existing.shortQuantity = round8(shortQty - cover);
          if (existing.shortQuantity <= EPS) {
            existing.shortQuantity = 0;
            existing.avgShortPrice = 0;
          }
          remaining -= cover;
        }

        if (remaining > 0) {
          const newLong = longQty + remaining;
          const newAvg = longQty <= EPS
            ? executedPrice
            : (existing.avgBuyPrice * longQty + executedPrice * remaining) / newLong;
          existing.quantity = round8(newLong);
          existing.avgBuyPrice = round8(newAvg);
          if (!existing.openedAt) existing.openedAt = now;
        }
        existing.lastTradeAt = now;

        normalizeAsset(existing);
        if (!hasExposure(existing)) portfolio.assets.splice(idx, 1);
      }
      pruneEmptyAssets(portfolio);
      await portfolioRepository.save(portfolio);
    } else {
      // SELL: close long first; remainder opens / increases paper short.
      const idx = portfolio.assets.findIndex((a) => a.coinId === order.coinId);
      const existing = idx === -1 ? null : portfolio.assets[idx];
      const longQty = existing ? (existing.quantity || 0) : 0;
      const sellFromLong = Math.min(order.quantity, longQty);
      const toShort = order.quantity - sellFromLong;
      const now = new Date();

      if (!existing && toShort <= 0) {
        await orderRepository.updateStatus(order._id, {
          status: 'CANCELLED',
          cancelledAt: new Date()
        });
        throw httpError(400, 'Insufficient asset balance');
      }

      if (existing) {
        if (sellFromLong > 0) existing.quantity = round8(longQty - sellFromLong);
        if (toShort > 0) {
          const prevS = existing.shortQuantity || 0;
          const newS = prevS + toShort;
          const newAvgShort = prevS <= EPS
            ? executedPrice
            : (existing.avgShortPrice * prevS + executedPrice * toShort) / newS;
          existing.shortQuantity = round8(newS);
          existing.avgShortPrice = round8(newAvgShort);
          if (!existing.openedAt) existing.openedAt = now;
        }
        existing.lastTradeAt = now;
        normalizeAsset(existing);
        if (!hasExposure(existing)) portfolio.assets.splice(idx, 1);
      } else {
        portfolio.assets.push({
          symbol: order.symbol,
          coinId: order.coinId,
          name: order.name,
          quantity: 0,
          avgBuyPrice: 0,
          shortQuantity: round8(toShort),
          avgShortPrice: executedPrice,
          openedAt: now,
          lastTradeAt: now
        });
      }

      user.cashBalance = round2(user.cashBalance + total);
      await user.save();
      pruneEmptyAssets(portfolio);
      await portfolioRepository.save(portfolio);
    }

    const filled = await orderRepository.updateStatus(order._id, {
      status: 'FILLED',
      executedPrice,
      filledAt: new Date()
    });

    await transactionRepository.create({
      user: order.user,
      order: order._id,
      symbol: order.symbol,
      coinId: order.coinId,
      name: order.name,
      side: order.side,
      quantity: order.quantity,
      price: executedPrice,
      total: round2(total),
      fee: 0
    });

    logger.info(
      `Order FILLED: ${order.side} ${order.quantity} ${order.symbol} @ $${executedPrice} for user ${order.user}`
    );

    return filled;
  },

  /**
   * Close position leg(s) at market.
   * @param {Object} [options]
   * @param {'LONG'|'SHORT'|'ALL'} [options.side]  Which leg to close; default auto (ALL if both open).
   */
  async closePosition(userId, coinId, options = {}) {
    if (!coinId) throw httpError(400, 'coinId is required');

    let side = (options.side || '').toUpperCase();
    if (side && !['LONG', 'SHORT', 'ALL'].includes(side)) {
      throw httpError(400, 'side must be LONG, SHORT, or ALL');
    }

    const portfolio = await portfolioRepository.findOrCreate(userId);
    const asset = portfolio.assets.find((a) => a.coinId === coinId);
    if (!asset || !hasExposure(asset)) {
      throw httpError(404, 'No open position for this asset');
    }

    let { longQty, shortQty } = normalizeAsset(asset);
    if (!side) side = defaultCloseSide(longQty, shortQty);
    if (!side) throw httpError(404, 'No open position for this asset');

    const coin = await marketDataService.getCoin(coinId);
    const livePrice = await resolveLiveUsdPrice(coinId, coin);
    if (!livePrice) throw httpError(503, 'Live price unavailable');

    if (side === 'LONG' && longQty <= EPS) {
      throw httpError(400, 'No open long position to close');
    }
    if (side === 'SHORT' && shortQty <= EPS) {
      throw httpError(400, 'No open short position to cover');
    }

    if (side === 'ALL') {
      const longEntry = asset.avgBuyPrice || 0;
      const shortEntry = asset.avgShortPrice || 0;
      const exposureCost = longQty * longEntry + shortQty * (shortEntry > EPS ? shortEntry : livePrice);

      let totalPnl = 0;
      let lastResult = null;
      if (longQty > EPS) {
        lastResult = await orderService._closeLongLeg(userId, asset, longQty, livePrice);
        totalPnl += lastResult.realizedPnl;
      }
      const pf2 = await portfolioRepository.findOrCreate(userId);
      const asset2 = pf2.assets.find((a) => a.coinId === coinId);
      ({ longQty, shortQty } = asset2 ? normalizeAsset(asset2) : { longQty: 0, shortQty: 0 });
      if (shortQty > EPS) {
        if (!asset2) throw httpError(404, 'No open position for this asset');
        const shortResult = await orderService._closeShortLeg(userId, asset2, shortQty, livePrice);
        totalPnl = round2(totalPnl + shortResult.realizedPnl);
        lastResult = shortResult;
      }
      const realizedPnlPct = exposureCost > 0
        ? round2((totalPnl / exposureCost) * 100)
        : 0;
      return {
        order: lastResult?.order,
        realizedPnl: round2(totalPnl),
        realizedPnlPct,
        entryPrice: longEntry || shortEntry || livePrice,
        exitPrice: livePrice,
        closedSide: 'ALL'
      };
    }

    if (side === 'LONG') {
      return { ...await orderService._closeLongLeg(userId, asset, longQty, livePrice), closedSide: 'LONG' };
    }

    return { ...await orderService._closeShortLeg(userId, asset, shortQty, livePrice), closedSide: 'SHORT' };
  },

  async _closeLongLeg(userId, asset, longQty, livePrice) {
    const entryPrice = asset.avgBuyPrice || 0;
    const order = await orderRepository.create({
      user: userId,
      symbol: asset.symbol,
      coinId: asset.coinId,
      name: asset.name,
      type: 'MARKET',
      side: 'SELL',
      quantity: longQty,
      price: livePrice,
      status: 'PENDING'
    });
    const filled = await orderService._executeOrder(order, livePrice);
    const realizedPnl = round2((livePrice - entryPrice) * longQty);
    const realizedPnlPct = entryPrice > 0
      ? round2(((livePrice - entryPrice) / entryPrice) * 100)
      : 0;
    return {
      order: filled,
      realizedPnl,
      realizedPnlPct,
      entryPrice,
      exitPrice: livePrice,
      closedQty: longQty
    };
  },

  async _closeShortLeg(userId, asset, shortQty, livePrice) {
    let entryPrice = asset.avgShortPrice || 0;
    if (entryPrice <= EPS) {
      logger.warn(`Short ${asset.symbol} missing avgShortPrice; using mark $${livePrice} for P&L`);
      entryPrice = livePrice;
      asset.avgShortPrice = livePrice;
    }
    const order = await orderRepository.create({
      user: userId,
      symbol: asset.symbol,
      coinId: asset.coinId,
      name: asset.name,
      type: 'MARKET',
      side: 'BUY',
      quantity: shortQty,
      price: livePrice,
      status: 'PENDING'
    });
    const filled = await orderService._executeOrder(order, livePrice);
    const realizedPnl = round2((entryPrice - livePrice) * shortQty);
    const realizedPnlPct = entryPrice > 0
      ? round2(((entryPrice - livePrice) / entryPrice) * 100)
      : 0;
    return {
      order: filled,
      realizedPnl,
      realizedPnlPct,
      entryPrice,
      exitPrice: livePrice,
      closedQty: shortQty
    };
  },

  async cancelOrder(userId, orderId) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw httpError(404, 'Order not found');
    if (String(order.user) !== String(userId)) throw httpError(403, 'Not your order');
    if (order.status !== 'PENDING') throw httpError(400, `Order is ${order.status}, cannot cancel`);

    return orderRepository.updateStatus(orderId, {
      status: 'CANCELLED',
      cancelledAt: new Date()
    });
  },

  async listUserOrders(userId, status) {
    const filter = status ? { status } : {};
    return orderRepository.findByUser(userId, filter);
  },

  /**
   * Background worker entry point. Iterates pending limit orders
   * and fills/expires them as appropriate. Called periodically by server.
   */
  async processPendingLimitOrders() {
    const pendings = await orderRepository.findPendingLimitOrders();
    if (!pendings.length) return { checked: 0, filled: 0, expired: 0 };

    const ids = [...new Set(pendings.map((o) => o.coinId))];
    const priceMap = await marketDataService.getPriceMap(ids);

    let filled = 0, expired = 0;
    const now = Date.now();

    for (const order of pendings) {
      // Expire first if applicable
      if (order.expiresAt && new Date(order.expiresAt).getTime() <= now) {
        await orderRepository.updateStatus(order._id, { status: 'EXPIRED' });
        expired++;
        continue;
      }

      const market = priceMap[order.coinId];
      if (!market) continue;

      if (orderService._shouldFill(order.side, order.price, market)) {
        try {
          await orderService._executeOrder(order, market);
          filled++;
        } catch (e) {
          logger.warn(`Limit order ${order._id} failed to fill: ${e.message}`);
        }
      }
    }

    return { checked: pendings.length, filled, expired };
  }
};

module.exports = orderService;
