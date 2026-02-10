/**
 * @module errors
 * @description Custom error classes for eWei SDK.
 */

/**
 * Base error for all eWei SDK errors.
 */
export class EweiError extends Error {
  /**
   * @param {string} message - Human-readable error description.
   * @param {string} code - Machine-readable error code.
   * @param {Record<string, unknown>} [details] - Additional context.
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'EweiError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Thrown when the sponsor account does not have enough BNB to cover the
 * estimated gas cost of a transaction.
 */
export class InsufficientBalanceError extends EweiError {
  /**
   * @param {string} required - Required balance in BNB (human-readable).
   * @param {string} available - Available balance in BNB (human-readable).
   */
  constructor(required, available) {
    super(
      `Insufficient sponsor balance: need ${required} BNB, have ${available} BNB`,
      'INSUFFICIENT_BALANCE',
      { required, available },
    );
    this.name = 'InsufficientBalanceError';
  }
}

/**
 * Thrown when a transaction violates one or more gas spending policies
 * configured on the sponsor account.
 */
export class PolicyViolationError extends EweiError {
  /**
   * @param {string} policyId - ID of the violated policy.
   * @param {string} reason - Why the policy was violated.
   */
  constructor(policyId, reason) {
    super(
      `Policy violation [${policyId}]: ${reason}`,
      'POLICY_VIOLATION',
      { policyId, reason },
    );
    this.name = 'PolicyViolationError';
  }
}

/**
 * Thrown when the relayer returns an unexpected error or is unreachable.
 */
export class RelayerError extends EweiError {
  /**
   * @param {string} message - Error message from the relayer.
   * @param {number} [statusCode] - HTTP status code, if available.
   */
  constructor(message, statusCode) {
    super(
      `Relayer error: ${message}`,
      'RELAYER_ERROR',
      { statusCode },
    );
    this.name = 'RelayerError';
  }
}

/**
 * Thrown when a request to the relayer times out.
 */
export class TimeoutError extends EweiError {
  /**
   * @param {number} ms - Timeout duration in milliseconds.
   */
  constructor(ms) {
    super(
      `Request timed out after ${ms}ms`,
      'TIMEOUT',
      { timeoutMs: ms },
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Thrown when the provided API key is invalid or expired.
 */
export class AuthenticationError extends EweiError {
  constructor() {
    super(
      'Invalid or expired API key',
      'AUTH_ERROR',
    );
    this.name = 'AuthenticationError';
  }
}
