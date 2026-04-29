// src/models/Order.js
// Order state machine:
//   PENDING -> FILLED       (limit order triggered, or market order executed)
//   PENDING -> CANCELLED    (user cancelled)
//   PENDING -> EXPIRED      (TTL passed without trigger)
// Market orders skip PENDING and go straight to FILLED.

const mongoose = require('mongoose');

const ORDER_STATUS = ['PENDING', 'FILLED', 'CANCELLED', 'EXPIRED'];
const ORDER_TYPE   = ['MARKET', 'LIMIT'];
const ORDER_SIDE   = ['BUY', 'SELL'];

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    symbol:  { type: String, required: true, uppercase: true },
    coinId:  { type: String, required: true },
    name:    { type: String, required: true },

    type:    { type: String, enum: ORDER_TYPE, required: true },
    side:    { type: String, enum: ORDER_SIDE, required: true },
    quantity: { type: Number, required: true, min: 0 },

    // For MARKET orders this is the executed price.
    // For LIMIT orders this is the trigger price; executedPrice fills in on FILLED.
    price:         { type: Number, required: true, min: 0 },
    executedPrice: { type: Number, default: null },

    status: { type: String, enum: ORDER_STATUS, default: 'PENDING', index: true },

    filledAt:    { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    expiresAt:   { type: Date, default: null } // optional TTL for limit orders
  },
  { timestamps: true }
);

orderSchema.statics.STATUS = ORDER_STATUS;
orderSchema.statics.TYPE   = ORDER_TYPE;
orderSchema.statics.SIDE   = ORDER_SIDE;

module.exports = mongoose.model('Order', orderSchema);
