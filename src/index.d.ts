/**
 * eWei SDK — Gas sponsorship protocol for BNB Chain.
 */

// ---------------------------------------------------------------------------
// Enums & constants
// ---------------------------------------------------------------------------

export declare const SponsorStatus: {
  readonly PENDING: 'pending';
  readonly SUBMITTED: 'submitted';
  readonly CONFIRMED: 'confirmed';
  readonly REVERTED: 'reverted';
  readonly REJECTED: 'rejected';
  readonly EXPIRED: 'expired';
};
export type SponsorStatus = (typeof SponsorStatus)[keyof typeof SponsorStatus];

export declare const PolicyType: {
  readonly UNLIMITED: 'unlimited';
  readonly DAILY_CAP: 'daily_cap';
  readonly PER_TX_CAP: 'per_tx_cap';
  readonly CONTRACT_WHITELIST: 'contract_whitelist';
  readonly COMPOSITE: 'composite';
};
export type PolicyType = (typeof PolicyType)[keyof typeof PolicyType];

export declare const WebhookEvent: {
  readonly TX_CONFIRMED: 'tx.confirmed';
  readonly TX_REVERTED: 'tx.reverted';
  readonly BALANCE_LOW: 'balance.low';
  readonly POLICY_LIMIT_REACHED: 'policy.limit_reached';
};
export type WebhookEvent = (typeof WebhookEvent)[keyof typeof WebhookEvent];

export declare const BSC_MAINNET: ChainConfig;
export declare const BSC_TESTNET: ChainConfig;
export declare const GAS_DEFAULTS: GasDefaults;
export declare const DEFAULT_RELAYER_URL: string;

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface GasDefaults {
  TRANSFER_GAS_LIMIT: bigint;
  TOKEN_TRANSFER_GAS_LIMIT: bigint;
  SWAP_GAS_LIMIT: bigint;
  MAX_GAS_LIMIT: bigint;
  GAS_PRICE_PADDING: number;
  MIN_GAS_PRICE_GWEI: bigint;
  MAX_GAS_PRICE_GWEI: bigint;
}

export interface EweiClientOptions {
  /** Your eWei API key. */
  apiKey: string;
  /** Override the default relayer URL. */
  relayerUrl?: string;
  /** Request timeout in milliseconds (default 30 000). */
  timeout?: number;
  /** Maximum retry attempts for transient errors. */
  maxRetries?: number;
}

export interface TxRequest {
  /** Target contract or recipient address. */
  to: string;
  /** User wallet address (originator). */
  from: string;
  /** Encoded calldata (hex). */
  data?: string;
  /** BNB value in Wei (hex or decimal string). */
  value?: string;
  /** Chain ID (default: 56 for BSC mainnet). */
  chainId?: number;
  /** Override gas limit (decimal string). */
  gasLimit?: string;
}

export interface SponsorOptions {
  /** Apply a specific policy to this transaction. */
  policyId?: string;
}

export interface SponsorResult {
  /** Unique sponsor tracking ID. */
  sponsorId: string;
  /** BSC transaction hash (available once submitted). */
  txHash: string | null;
  /** Current status. */
  status: SponsorStatus;
  /** Gas price used in Wei. */
  gasPriceWei: string;
  /** Gas limit allocated. */
  gasLimit: string;
  /** Estimated cost in BNB. */
  estimatedCostBnb: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface GasEstimate {
  /** Estimated gas units. */
  gasUnits: string;
  /** Current gas price in Wei. */
  gasPriceWei: string;
  /** Total estimated cost in Wei. */
  totalCostWei: string;
  /** Total estimated cost in BNB. */
  totalCostBnb: string;
  /** Whether the sponsor account can cover this cost. */
  canSponsor: boolean;
}

export interface SponsorStatusResult {
  sponsorId: string;
  txHash: string | null;
  status: SponsorStatus;
  blockNumber: number | null;
  gasUsed: string | null;
  effectiveGasPrice: string | null;
  confirmedAt: string | null;
}

export interface BalanceResult {
  /** Available balance in Wei. */
  balanceWei: string;
  /** Available balance in BNB. */
  balanceBnb: string;
  /** Total gas sponsored today in Wei. */
  todaySpentWei: string;
  /** Number of transactions sponsored today. */
  todayTxCount: number;
}

export interface DepositResult {
  /** BSC address to send BNB to. */
  depositAddress: string;
  /** Minimum deposit in BNB. */
  minimumDeposit: string;
  /** Expected confirmations. */
  confirmations: number;
}

export interface Policy {
  id: string;
  name: string;
  type: PolicyType;
  maxGasPerTx: string | null;
  dailyLimit: string | null;
  dailyUsed: string;
  allowedContracts: string[];
  active: boolean;
  createdAt: string;
}

export interface CreatePolicyParams {
  name: string;
  maxGasPerTx?: string;
  dailyLimit?: string;
  allowedContracts?: string[];
}

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
}

export interface WebhookCreateParams {
  url: string;
  events?: WebhookEvent[];
}

export interface WebhookDeleteParams {
  webhookId: string;
}

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export declare class EweiError extends Error {
  code: string;
  details: Record<string, unknown>;
  constructor(message: string, code: string, details?: Record<string, unknown>);
}

export declare class InsufficientBalanceError extends EweiError {
  constructor(required: string, available: string);
}

export declare class PolicyViolationError extends EweiError {
  constructor(policyId: string, reason: string);
}

export declare class RelayerError extends EweiError {
  constructor(message: string, statusCode?: number);
}

export declare class TimeoutError extends EweiError {
  constructor(ms: number);
}

export declare class AuthenticationError extends EweiError {
  constructor();
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export declare class EweiClient {
  constructor(options: EweiClientOptions);

  /** Sponsor a transaction's gas fees. */
  sponsor(txRequest: TxRequest, options?: SponsorOptions): Promise<SponsorResult>;

  /** Estimate gas cost without submitting. */
  estimate(txRequest: TxRequest): Promise<GasEstimate>;

  /** Check the status of a sponsored transaction. */
  status(sponsorId: string): Promise<SponsorStatusResult>;

  /** Check sponsor account balance. */
  balance(): Promise<BalanceResult>;

  /** Deposit BNB into sponsor account. */
  deposit(amount: string): Promise<DepositResult>;

  /** List all gas spending policies. */
  policies(): Promise<Policy[]>;

  /** Create a new gas spending policy. */
  createPolicy(params: CreatePolicyParams): Promise<Policy>;

  /** Manage webhooks: list, create, or delete. */
  webhooks(action: 'list'): Promise<{ webhooks: Webhook[] }>;
  webhooks(action: 'create', params: WebhookCreateParams): Promise<Webhook>;
  webhooks(action: 'delete', params: WebhookDeleteParams): Promise<{ deleted: boolean }>;
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

export declare function formatGwei(wei: bigint): string;
export declare function parseGwei(gwei: number | string): bigint;
export declare function formatBNB(wei: bigint): string;
export declare function parseBNB(bnb: string): bigint;
export declare function estimateGasCost(gasLimit: bigint, gasPriceWei: bigint): bigint;
export declare function padGasLimit(gasLimit: bigint, multiplier?: number): bigint;
export declare function isValidAddress(address: string): boolean;
