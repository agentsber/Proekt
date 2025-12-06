// Currency conversion rates (USD as base)
const EXCHANGE_RATES = {
  usd: 1,
  eur: 0.92,    // 1 USD = 0.92 EUR
  rub: 95.50    // 1 USD = 95.50 RUB
};

// Currency symbols
const CURRENCY_SYMBOLS = {
  usd: '$',
  eur: '€',
  rub: '₽'
};

// Currency names
const CURRENCY_NAMES = {
  usd: 'USD',
  eur: 'EUR',
  rub: 'RUB'
};

/**
 * Convert price from USD to target currency
 * @param {number} priceUSD - Price in USD
 * @param {string} targetCurrency - Target currency code (usd, eur, rub)
 * @returns {number} Converted price
 */
export const convertPrice = (priceUSD, targetCurrency = 'usd') => {
  const rate = EXCHANGE_RATES[targetCurrency.toLowerCase()] || 1;
  return priceUSD * rate;
};

/**
 * Format price with currency symbol
 * @param {number} priceUSD - Price in USD
 * @param {string} currency - Currency code (usd, eur, rub)
 * @param {boolean} showDecimals - Show decimal places
 * @returns {string} Formatted price string
 */
export const formatPrice = (priceUSD, currency = 'usd', showDecimals = true) => {
  const convertedPrice = convertPrice(priceUSD, currency);
  const symbol = CURRENCY_SYMBOLS[currency.toLowerCase()] || '$';
  
  // For RUB, don't show decimals
  const decimals = currency.toLowerCase() === 'rub' ? 0 : (showDecimals ? 2 : 0);
  
  const formattedNumber = convertedPrice.toFixed(decimals);
  
  // For EUR and RUB, put symbol after number
  if (currency.toLowerCase() === 'eur' || currency.toLowerCase() === 'rub') {
    return `${formattedNumber}${symbol}`;
  }
  
  // For USD, put symbol before number
  return `${symbol}${formattedNumber}`;
};

/**
 * Get currency symbol
 * @param {string} currency - Currency code
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currency = 'usd') => {
  return CURRENCY_SYMBOLS[currency.toLowerCase()] || '$';
};

/**
 * Get currency name
 * @param {string} currency - Currency code
 * @returns {string} Currency name
 */
export const getCurrencyName = (currency = 'usd') => {
  return CURRENCY_NAMES[currency.toLowerCase()] || 'USD';
};

export default {
  convertPrice,
  formatPrice,
  getCurrencySymbol,
  getCurrencyName,
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
  CURRENCY_NAMES
};
