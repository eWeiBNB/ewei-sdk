/**
 * @module constants
 * @description Chain configuration, gas defaults, and API endpoints for eWei SDK.
 */

/** BNB Smart Chain Mainnet configuration */
export const BSC_MAINNET = {
  chainId: 56,
  name: 'BNB Smart Chain',
  rpcUrl: 'https://bsc-dataseed1.binance.org',
  blockExplorer: 'https://bscscan.com',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
};

/** BNB Smart Chain Testnet configuration */
export const BSC_TESTNET = {
  chainId: 97,
  name: 'BNB Smart Chain Testnet',
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  blockExplorer: 'https://testnet.bscscan.com',
  nativeCurrency: {
    name: 'tBNB',
    symbol: 'tBNB',
    decimals: 18,
  },
};

/** Default gas parameters for BSC */
export const GAS_DEFAULTS = {
  /** Default gas limit for a simple BNB transfer */
  TRANSFER_GAS_LIMIT: 21_000n,
  /** Default gas limit for ERC-20 token transfers */
  TOKEN_TRANSFER_GAS_LIMIT: 65_000n,
  /** Default gas limit for swap operations */
  SWAP_GAS_LIMIT: 300_000n,
  /** Maximum gas limit the relayer will accept */
  MAX_GAS_LIMIT: 10_000_000n,
  /** Default gas price padding multiplier (1.1x) */
  GAS_PRICE_PADDING: 1.1,
  /** Minimum gas price in Gwei */
  MIN_GAS_PRICE_GWEI: 1n,
  /** Maximum gas price in Gwei the relayer will sponsor */
  MAX_GAS_PRICE_GWEI: 30n,
};

/** eWei relayer API endpoints */
export const API_ENDPOINTS = {
  SPONSOR: '/v1/sponsor',
  ESTIMATE: '/v1/estimate',
  STATUS: '/v1/sponsor/:id/status',
  BALANCE: '/v1/account/balance',
  DEPOSIT: '/v1/account/deposit',
  POLICIES: '/v1/policies',
  CREATE_POLICY: '/v1/policies',
  WEBHOOKS: '/v1/webhooks',
};

/** Default relayer URL */
export const DEFAULT_RELAYER_URL = 'https://relayer.ewei.io';

/** SDK version — kept in sync with package.json */
export const SDK_VERSION = '0.1.0';

/** Request timeout in milliseconds */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Maximum retry attempts for transient failures */
export const MAX_RETRIES = 3;

/** Retry backoff base in milliseconds */
export const RETRY_BACKOFF_MS = 1_000;
