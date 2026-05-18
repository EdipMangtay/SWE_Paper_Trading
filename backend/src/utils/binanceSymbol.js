// Server-side mapping: CoinGecko id -> Binance USDT spot symbol.
// Mirrors frontend/src/utils/tradingViewSymbol.js so the live price we serve
// matches the symbol drawn by the TradingView chart.

const MAP = {
  bitcoin:          'BTCUSDT',
  ethereum:         'ETHUSDT',
  binancecoin:      'BNBUSDT',
  ripple:           'XRPUSDT',
  solana:           'SOLUSDT',
  cardano:          'ADAUSDT',
  dogecoin:         'DOGEUSDT',
  tron:             'TRXUSDT',
  polkadot:         'DOTUSDT',
  'matic-network':  'MATICUSDT',
  polygon:          'MATICUSDT',
  'shiba-inu':      'SHIBUSDT',
  litecoin:         'LTCUSDT',
  'avalanche-2':    'AVAXUSDT',
  chainlink:        'LINKUSDT',
  'bitcoin-cash':   'BCHUSDT',
  stellar:          'XLMUSDT',
  uniswap:          'UNIUSDT',
  cosmos:           'ATOMUSDT',
  monero:           'XMRUSDT',
  'ethereum-classic':'ETCUSDT',
  filecoin:         'FILUSDT',
  'internet-computer':'ICPUSDT',
  vechain:          'VETUSDT',
  algorand:         'ALGOUSDT',
  'hedera-hashgraph':'HBARUSDT',
  aptos:            'APTUSDT',
  arbitrum:         'ARBUSDT',
  optimism:         'OPUSDT',
  near:             'NEARUSDT',
  fantom:           'FTMUSDT',
  sui:              'SUIUSDT',
  injective:        'INJUSDT',
  render:           'RNDRUSDT',
  'render-token':   'RNDRUSDT',
  aave:             'AAVEUSDT',
  maker:            'MKRUSDT',
  'the-graph':      'GRTUSDT',
  sandbox:          'SANDUSDT',
  'the-sandbox':    'SANDUSDT',
  decentraland:     'MANAUSDT',
  'axie-infinity':  'AXSUSDT',
  pepe:             'PEPEUSDT',
  bonk:             'BONKUSDT',
  pancakeswap:      'CAKEUSDT',
  curve:            'CRVUSDT',
  'curve-dao-token':'CRVUSDT',
  'lido-dao':       'LDOUSDT',
  worldcoin:        'WLDUSDT',
  'worldcoin-wld':  'WLDUSDT'
};

// Stablecoins quote in USDT 1:1 — Binance has USDCUSDT, BUSDUSDT etc.
const STABLE_OVERRIDE = {
  tether:    null,          // 1.00 hard-coded
  'usd-coin':'USDCUSDT',
  dai:       'DAIUSDT'
};

const symbolToCoinId = new Map();

function coinIdToBinanceSymbol(coinId, symbol = '') {
  if (!coinId) return null;
  if (coinId in STABLE_OVERRIDE) return STABLE_OVERRIDE[coinId];
  if (MAP[coinId]) return MAP[coinId];
  const sym = String(symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return sym ? `${sym}USDT` : null;
}

function binanceSymbolToCoinId(binanceSymbol, fallback = null) {
  if (!binanceSymbol) return fallback;
  if (symbolToCoinId.size === 0) {
    for (const [coinId, bSym] of Object.entries(MAP)) {
      if (!symbolToCoinId.has(bSym)) symbolToCoinId.set(bSym, coinId);
    }
    for (const [coinId, bSym] of Object.entries(STABLE_OVERRIDE)) {
      if (bSym && !symbolToCoinId.has(bSym)) symbolToCoinId.set(bSym, coinId);
    }
  }
  return symbolToCoinId.get(binanceSymbol) || fallback;
}

module.exports = { coinIdToBinanceSymbol, binanceSymbolToCoinId };
