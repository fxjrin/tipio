// Legacy exports (for backward compatibility)
export const ICP_LEDGER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
export const CKUSDC_LEDGER_ID = 'xevnm-gaaaa-aaaar-qafnq-cai';
export const CKBTC_LEDGER_ID = 'mxzaz-hqaaa-aaaar-qaada-cai';

// Display constants
export const MIN_DISPLAY_USD = 0.01; // Minimum USD to show with 2 decimals, below this show more decimals
export const MIN_DISPLAY_TOKEN = 0.00000001; // Minimum token amount to display (1 satoshi for 8 decimals)

// Import from dynamic registry
export { SUPPORTED_TOKENS, tokenRegistry, getTokenBySymbol, getTokenByCanisterId } from './icrc1';

/**
 * Format token amount - removes trailing zeros
 * @param {number|bigint} amount - Token amount in base units
 * @param {number} decimals - Token decimals
 * @param {number} maxDecimals - Maximum decimals to show (default = decimals)
 * @returns {string} Formatted token amount
 */
export function formatTokenAmount(amount, decimals = 8, maxDecimals = null) {
  const divisor = Math.pow(10, decimals);
  const tokenAmount = Number(amount) / divisor;

  if (tokenAmount === 0) return '0';

  // Use maxDecimals or full decimals
  const precision = maxDecimals !== null ? maxDecimals : decimals;

  // Format with full precision then remove trailing zeros
  return tokenAmount.toFixed(precision).replace(/\.?0+$/, '');
}

/**
 * Format USD value - removes trailing zeros and handles small amounts
 * @param {number} usdValue - USD value
 * @returns {string} Formatted USD string
 */
export function formatUSDAmount(usdValue) {
  if (!usdValue || usdValue === 0) return '$0.00';

  // For small amounts, show up to 4 decimals but remove trailing zeros
  if (usdValue < MIN_DISPLAY_USD) {
    const formatted = usdValue.toFixed(4).replace(/\.?0+$/, '');
    // If after removing zeros it becomes '0', show $0.00
    if (formatted === '0') return '$0.00';
    return '$' + formatted;
  }

  // For regular amounts, show 2 decimals and remove trailing zeros
  const formatted = usdValue.toFixed(2).replace(/\.?0+$/, '');
  // If after removing zeros it becomes '0', show $0.00
  if (formatted === '0') return '$0.00';
  return '$' + formatted;
}
