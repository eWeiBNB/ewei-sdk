/**
 * @module utils
 * @description Utility helpers for gas calculation, formatting, and validation.
 */

import { GAS_DEFAULTS, BSC_MAINNET } from './constants.js';

/**
 * Convert a value in Wei to Gwei.
 * @param {bigint} wei - Value in Wei.
 * @returns {string} Value in Gwei (decimal string).
 */
export function formatGwei(wei) {
  const gwei = wei / 1_000_000_000n;
  const remainder = wei % 1_000_000_000n;
  if (remainder === 0n) return gwei.toString();
  const decimal = remainder.toString().padStart(9, '0').replace(/0+$/, '');
  return `${gwei}.${decimal}`;
}

/**
 * Convert Gwei to Wei.
 * @param {number|string} gwei - Value in Gwei.
 * @returns {bigint} Value in Wei.
 */
export function parseGwei(gwei) {
  const str = String(gwei);
  const [whole = '0', frac = ''] = str.split('.');
  const padded = frac.padEnd(9, '0').slice(0, 9);
  return BigInt(whole) * 1_000_000_000n + BigInt(padded);
}

/**
 * Convert Wei to BNB (18 decimals).
 * @param {bigint} wei - Value in Wei.
 * @returns {string} Human-readable BNB string.
 */
export function formatBNB(wei) {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

/**
 * Convert BNB string to Wei.
 * @param {string} bnb - BNB amount as a decimal string.
 * @returns {bigint} Value in Wei.
 */
export function parseBNB(bnb) {
  const [whole = '0', frac = ''] = bnb.split('.');
  const padded = frac.padEnd(18, '0').slice(0, 18);
  return BigInt(whole) * 10n ** 18n + BigInt(padded);
}

/**
 * Estimate the total gas cost in Wei for a transaction.
 * @param {bigint} gasLimit - Gas units.
 * @param {bigint} gasPriceWei - Gas price in Wei.
 * @returns {bigint} Total cost in Wei.
 */
export function estimateGasCost(gasLimit, gasPriceWei) {
  return gasLimit * gasPriceWei;
}

/**
 * Apply a padding multiplier to a gas limit to avoid out-of-gas reverts.
 * @param {bigint} gasLimit - Original gas estimate.
 * @param {number} [multiplier=1.2] - Padding factor.
 * @returns {bigint} Padded gas limit.
 */
export function padGasLimit(gasLimit, multiplier = 1.2) {
  return BigInt(Math.ceil(Number(gasLimit) * multiplier));
}

/**
 * Validate that a hex string is a valid Ethereum/BSC address.
 * @param {string} address - Address to validate.
 * @returns {boolean} True if the address is valid.
 */
export function isValidAddress(address) {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Validate a transaction request object has the minimum required fields.
 * @param {object} txRequest - Transaction request.
 * @throws {Error} If required fields are missing.
 */
export function validateTxRequest(txRequest) {
  if (!txRequest || typeof txRequest !== 'object') {
    throw new Error('txRequest must be a non-null object');
  }
  if (!txRequest.to || !isValidAddress(txRequest.to)) {
    throw new Error('txRequest.to must be a valid BSC address');
  }
  if (txRequest.chainId && txRequest.chainId !== BSC_MAINNET.chainId && txRequest.chainId !== 97) {
    throw new Error(`Unsupported chainId ${txRequest.chainId}. eWei supports BSC mainnet (56) and testnet (97)`);
  }
}

/**
 * Clamp a gas price to the relayer's accepted range.
 * @param {bigint} gasPriceWei - Proposed gas price in Wei.
 * @returns {bigint} Clamped gas price in Wei.
 */
export function clampGasPrice(gasPriceWei) {
  const minWei = GAS_DEFAULTS.MIN_GAS_PRICE_GWEI * 1_000_000_000n;
  const maxWei = GAS_DEFAULTS.MAX_GAS_PRICE_GWEI * 1_000_000_000n;
  if (gasPriceWei < minWei) return minWei;
  if (gasPriceWei > maxWei) return maxWei;
  return gasPriceWei;
}

/**
 * Sleep for a given duration. Used for retry backoff.
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the full URL for an API endpoint, replacing path parameters.
 * @param {string} baseUrl - Relayer base URL.
 * @param {string} path - Endpoint path template (e.g. '/v1/sponsor/:id/status').
 * @param {Record<string, string>} [params] - Path parameter replacements.
 * @returns {string} Full URL.
 */
export function buildUrl(baseUrl, path, params = {}) {
  let resolved = path;
  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replace(`:${key}`, encodeURIComponent(value));
  }
  return `${baseUrl.replace(/\/+$/, '')}${resolved}`;
}
