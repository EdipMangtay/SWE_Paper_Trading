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

function httpError(status, message) {
  const e = new Error(message); e.status = status; return e;
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
    const livePrice = coin.current_price;
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
      if (user.cashBalance < total) {
        await orderRepository.updateStatus(order._id, {
          status: 'CANCELLED',
          cancelledAt: new Date()
        });
        throw httpError(400, 'Insufficient cash balance');
      }
      // Decrement cash
      user.cashBalance = round2(user.cashBalance - total);
      await user.save();

      // Add or merge holding
      const idx = portfolio.assets.findIndex((a) => a.coinId === order.coinId);
      if (idx === -1) {
        portfolio.assets.push({
          symbol: order.symbol,
          coinId: order.coinId,
          name: order.name,
          quantity: order.quantity,
          avgBuyPrice: executedPrice
        });
      } else {
        const existing = portfolio.assets[idx];
        const newQty = existing.quantity + order.quantity;
        // Weighted-average cost basis
        const newAvg =
          (existing.avgBuyPrice * existing.quantity + executedPrice * order.quantity) / newQty;
        existing.quantity = newQty;
        existing.avgBuyPrice = round8(newAvg);
      }
      await portfolioRepository.save(portfolio);
    } else {
      // SELL
      const idx = portfolio.assets.findIndex((a) => a.coinId === order.coinId);
      if (idx === -1 || portfolio.assets[idx].quantity < order.quantity) {
        await orderRepository.updateStatus(order._id, {
          status: 'CANCELLED',
          cancelledAt: new Date()
        });
        throw httpError(400, 'Insufficient asset balance');
      }
      const existing = portfolio.assets[idx];
      existing.quantity = round8(existing.quantity - order.quantity);
      if (existing.quantity <= 1e-12) {
        portfolio.assets.splice(idx, 1); // close position
      }
      await portfolioRepository.save(portfolio);

      user.cashBalance = round2(user.cashBalance + total);
      await user.save();
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

function round2(x) { return Math.round(x * 100) / 100; }
function round8(x) { return Math.round(x * 1e8) / 1e8; }

module.exports = orderService;
