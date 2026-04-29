// src/models/Transaction.js
// Immutable record of every executed trade. Created when an order is FILLED.
// Used to build the user's trade history page.

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },

    symbol:   { type: String, required: true, uppercase: true },
    coinId:   { type: String, required: true },
    name:     { type: String, required: true },

    side:     { type: String, enum: ['BUY', 'SELL'], required: true },
    quantity: { type: Number, required: true, min: 0 },
    price:    { type: Number, required: true, min: 0 }, // executed price
    total:    { type: Number, required: true, min: 0 }, // quantity * price
    fee:      { type: Number, default: 0 }              // simulation: 0 for now
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
