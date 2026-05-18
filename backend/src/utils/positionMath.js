// Shared helpers for long/short paper positions (quantities, dust, P&L).

const EPS = 1e-8;

function round2(x) { return Math.round(x * 100) / 100; }
function round8(x) { return Math.round(x * 1e8) / 1e8; }

/**
 * Zero out floating-point dust and return effective long/short sizes.
 * Mutates the asset subdocument in place.
 */
function normalizeAsset(asset) {
  if (!asset) return { longQty: 0, shortQty: 0 };

  let longQty = round8(Number(asset.quantity) || 0);
  let shortQty = round8(Number(asset.shortQuantity) || 0);

  if (longQty <= EPS) {
    longQty = 0;
    asset.quantity = 0;
  } else {
    asset.quantity = longQty;
  }

  if (shortQty <= EPS) {
    shortQty = 0;
    asset.shortQuantity = 0;
    asset.avgShortPrice = 0;
  } else {
    asset.shortQuantity = shortQty;
  }

  return { longQty, shortQty };
}

function hasExposure(asset) {
  const { longQty, shortQty } = normalizeAsset(asset);
  return longQty > EPS || shortQty > EPS;
}

function pruneEmptyAssets(portfolio) {
  portfolio.assets = portfolio.assets.filter((a) => hasExposure(a));
}

/** Infer default close mode when the client does not send `side`. */
function defaultCloseSide(longQty, shortQty) {
  const hasLong = longQty > EPS;
  const hasShort = shortQty > EPS;
  if (hasLong && hasShort) return 'ALL';
  if (hasShort) return 'SHORT';
  if (hasLong) return 'LONG';
  return null;
}

module.exports = {
  EPS,
  round2,
  round8,
  normalizeAsset,
  hasExposure,
  pruneEmptyAssets,
  defaultCloseSide
};
