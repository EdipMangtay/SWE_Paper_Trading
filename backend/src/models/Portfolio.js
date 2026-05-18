// src/models/Portfolio.js
// One Portfolio per user. Stores holdings as an embedded array of assets.
// Each asset tracks symbol, quantity, and weighted-average buy price.

const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, uppercase: true }, // e.g. BTC, ETH
    coinId: { type: String, required: true },                  // CoinGecko id, e.g. bitcoin
    name:   { type: String, required: true },                  // display name
    quantity: { type: Number, required: true, min: 0 },
    avgBuyPrice: { type: Number, required: true, min: 0 },     // USD
    // Position lifecycle: openedAt is the timestamp of the first BUY that took
    // the position from zero to positive. It survives subsequent partial sells
    // and weighted-average adds. lastTradeAt updates on every fill.
    openedAt:   { type: Date, default: () => new Date() },
    lastTradeAt:{ type: Date, default: () => new Date() }
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    assets: [assetSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Portfolio', portfolioSchema);
