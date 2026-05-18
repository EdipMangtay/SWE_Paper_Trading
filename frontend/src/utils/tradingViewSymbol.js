// Maps CoinGecko coin ids to TradingView symbols.
// Most popular pairs live on Binance with a USDT quote; fall back to that.

const MAP = {
  bitcoin:        'BINANCE:BTCUSDT',
  ethereum:       'BINANCE:ETHUSDT',
  tether:         'BINANCE:USDTUSD',
  'usd-coin':     'BINANCE:USDCUSDT',
  binancecoin:    'BINANCE:BNBUSDT',
  ripple:         'BINANCE:XRPUSDT',
  solana:         'BINANCE:SOLUSDT',
  cardano:        'BINANCE:ADAUSDT',
  dogecoin:       'BINANCE:DOGEUSDT',
  'tron':         'BINANCE:TRXUSDT',
  polkadot:       'BINANCE:DOTUSDT',
  'matic-network':'BINANCE:MATICUSDT',
  polygon:        'BINANCE:MATICUSDT',
  'shiba-inu':    'BINANCE:SHIBUSDT',
  litecoin:       'BINANCE:LTCUSDT',
  'avalanche-2':  'BINANCE:AVAXUSDT',
  chainlink:      'BINANCE:LINKUSDT',
  'bitcoin-cash': 'BINANCE:BCHUSDT',
  stellar:        'BINANCE:XLMUSDT',
  uniswap:        'BINANCE:UNIUSDT',
  'cosmos':       'BINANCE:ATOMUSDT',
  monero:         'BINANCE:XMRUSDT',
  'ethereum-classic': 'BINANCE:ETCUSDT',
  filecoin:       'BINANCE:FILUSDT',
  'internet-computer': 'BINANCE:ICPUSDT',
  vechain:        'BINANCE:VETUSDT',
  algorand:       'BINANCE:ALGOUSDT',
  'hedera-hashgraph':  'BINANCE:HBARUSDT',
  aptos:          'BINANCE:APTUSDT',
  arbitrum:       'BINANCE:ARBUSDT',
  optimism:       'BINANCE:OPUSDT',
  near:           'BINANCE:NEARUSDT',
  fantom:         'BINANCE:FTMUSDT',
  sui:            'BINANCE:SUIUSDT',
  injective:      'BINANCE:INJUSDT',
  render:         'BINANCE:RNDRUSDT',
  'render-token': 'BINANCE:RNDRUSDT',
  aave:           'BINANCE:AAVEUSDT',
  maker:          'BINANCE:MKRUSDT',
  'the-graph':    'BINANCE:GRTUSDT',
  sandbox:        'BINANCE:SANDUSDT',
  'the-sandbox':  'BINANCE:SANDUSDT',
  decentraland:   'BINANCE:MANAUSDT',
  'axie-infinity':'BINANCE:AXSUSDT',
  'pepe':         'BINANCE:PEPEUSDT',
  bonk:           'BINANCE:BONKUSDT',
  pancakeswap:    'BINANCE:CAKEUSDT',
  curve:          'BINANCE:CRVUSDT',
  'curve-dao-token': 'BINANCE:CRVUSDT',
  'lido-dao':     'BINANCE:LDOUSDT',
  worldcoin:      'BINANCE:WLDUSDT',
  'worldcoin-wld':'BINANCE:WLDUSDT'
};

const STABLES = new Set(['tether', 'usd-coin', 'dai', 'busd', 'true-usd']);

export function coinIdToTradingViewSymbol(coinId, symbol = '') {
  if (!coinId) return 'BINANCE:BTCUSDT';
  if (MAP[coinId]) return MAP[coinId];
  if (STABLES.has(coinId)) return 'BINANCE:USDTUSD';
  const sym = (symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (sym) return `BINANCE:${sym}USDT`;
  return 'BINANCE:BTCUSDT';
}
