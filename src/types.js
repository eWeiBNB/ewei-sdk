/**
 * @module types
 * @description Enumerations and type constants for eWei SDK.
 */

/**
 * Status of a sponsored transaction.
 * @readonly
 * @enum {string}
 */
export const SponsorStatus = Object.freeze({
  /** Transaction has been received by the relayer */
  PENDING: 'pending',
  /** Relayer has submitted the transaction to BSC mempool */
  SUBMITTED: 'submitted',
  /** Transaction confirmed on-chain */
  CONFIRMED: 'confirmed',
  /** Transaction reverted on-chain */
  REVERTED: 'reverted',
  /** Relayer rejected the sponsorship request */
  REJECTED: 'rejected',
  /** Transaction timed out waiting for confirmation */
  EXPIRED: 'expired',
});

/**
 * Type of gas spending policy.
 * @readonly
 * @enum {string}
 */
export const PolicyType = Object.freeze({
  /** Unlimited sponsorship (use with caution) */
  UNLIMITED: 'unlimited',
  /** Fixed daily spending cap in BNB */
  DAILY_CAP: 'daily_cap',
  /** Per-transaction gas limit */
  PER_TX_CAP: 'per_tx_cap',
  /** Whitelist of allowed target contracts */
  CONTRACT_WHITELIST: 'contract_whitelist',
  /** Composite policy combining multiple rules */
  COMPOSITE: 'composite',
});

/**
 * Webhook event types.
 * @readonly
 * @enum {string}
 */
export const WebhookEvent = Object.freeze({
  /** Fired when a sponsored tx is confirmed */
  TX_CONFIRMED: 'tx.confirmed',
  /** Fired when a sponsored tx reverts */
  TX_REVERTED: 'tx.reverted',
  /** Fired when sponsor balance drops below threshold */
  BALANCE_LOW: 'balance.low',
  /** Fired when a policy limit is reached */
  POLICY_LIMIT_REACHED: 'policy.limit_reached',
});
