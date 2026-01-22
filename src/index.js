/**
 * @module @ewei/sdk
 * @description Gas sponsorship protocol SDK for BNB Chain.
 *
 * eWei lets dApps sponsor gas fees so their users never need native BNB to
 * interact with smart contracts on BNB Smart Chain.
 *
 * @example
 * ```js
 * import { EweiClient } from '@ewei/sdk';
 *
 * const ewei = new EweiClient({
 *   apiKey: process.env.EWEI_API_KEY,
 * });
 *
 * const result = await ewei.sponsor({
 *   to: '0xRecipient...',
 *   data: '0x...',
 *   from: '0xUserWallet...',
 * });
 *
 * console.log('Sponsor ID:', result.sponsorId);
 * ```
 */

import {
  DEFAULT_RELAYER_URL,
  API_ENDPOINTS,
  REQUEST_TIMEOUT_MS,
  MAX_RETRIES,
  RETRY_BACKOFF_MS,
  SDK_VERSION,
  BSC_MAINNET,
} from './constants.js';

import { SponsorStatus, WebhookEvent } from './types.js';

import {
  InsufficientBalanceError,
  PolicyViolationError,
  RelayerError,
  TimeoutError,
  AuthenticationError,
} from './errors.js';

import {
  validateTxRequest,
  buildUrl,
  sleep,
  padGasLimit,
  formatBNB,
  parseBNB,
} from './utils.js';

/**
 * Primary client for the eWei gas sponsorship protocol.
 *
 * Communicates with an eWei relayer to sponsor, estimate, and track
 * gasless transactions on BNB Smart Chain.
 */
export class EweiClient {
  /** @type {string} */
  #apiKey;

  /** @type {string} */
  #relayerUrl;

  /** @type {number} */
  #timeout;

  /** @type {number} */
  #maxRetries;

  /**
   * Create a new eWei client.
   *
   * @param {object} options
   * @param {string} options.apiKey - Your eWei API key.
   * @param {string} [options.relayerUrl] - Override the default relayer URL.
   * @param {number} [options.timeout] - Request timeout in ms (default 30 000).
   * @param {number} [options.maxRetries] - Max retry attempts for transient errors.
   */
  constructor({ apiKey, relayerUrl, timeout, maxRetries } = {}) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('apiKey is required and must be a non-empty string');
    }

    this.#apiKey = apiKey;
    this.#relayerUrl = (relayerUrl || DEFAULT_RELAYER_URL).replace(/\/+$/, '');
    this.#timeout = timeout ?? REQUEST_TIMEOUT_MS;
    this.#maxRetries = maxRetries ?? MAX_RETRIES;
  }

  // ---------------------------------------------------------------------------
  // Core methods
  // ---------------------------------------------------------------------------

  /**
   * Sponsor a transaction's gas fees.
   *
   * The relayer validates the request against your policies, signs a
   * meta-transaction, and submits it to BSC on the user's behalf.
   *
   * @param {object} txRequest - Transaction to sponsor.
   * @param {string} txRequest.to - Target contract or recipient address.
   * @param {string} txRequest.from - User wallet address (originator).
   * @param {string} [txRequest.data] - Encoded calldata (hex).
   * @param {string} [txRequest.value] - BNB value in Wei (hex or decimal string).
   * @param {number} [txRequest.chainId] - Chain ID (default: 56).
   * @param {string} [txRequest.gasLimit] - Override gas limit.
   * @param {object} [options]
   * @param {string} [options.policyId] - Apply a specific policy to this tx.
   * @returns {Promise<SponsorResult>} Sponsorship result with sponsor ID and tx hash.
   */
  async sponsor(txRequest, options = {}) {
    validateTxRequest(txRequest);

    const body = {
      tx: {
        to: txRequest.to,
        from: txRequest.from,
        data: txRequest.data || '0x',
        value: txRequest.value || '0x0',
        chainId: txRequest.chainId || BSC_MAINNET.chainId,
        gasLimit: txRequest.gasLimit || undefined,
      },
      policyId: options.policyId || undefined,
    };

    const res = await this.#post(API_ENDPOINTS.SPONSOR, body);
    return /** @type {SponsorResult} */ (res);
  }

  /**
   * Estimate the gas cost for a transaction without submitting it.
   *
   * Returns the estimated gas units, gas price, and total cost in BNB.
   *
   * @param {object} txRequest - Transaction to estimate.
   * @param {string} txRequest.to - Target address.
   * @param {string} txRequest.from - Sender address.
   * @param {string} [txRequest.data] - Calldata (hex).
   * @param {string} [txRequest.value] - Value in Wei.
   * @returns {Promise<GasEstimate>} Estimation details.
   */
  async estimate(txRequest) {
    validateTxRequest(txRequest);

    const body = {
      tx: {
        to: txRequest.to,
        from: txRequest.from,
        data: txRequest.data || '0x',
        value: txRequest.value || '0x0',
        chainId: txRequest.chainId || BSC_MAINNET.chainId,
      },
    };

    const res = await this.#post(API_ENDPOINTS.ESTIMATE, body);
    return /** @type {GasEstimate} */ (res);
  }

  /**
   * Check the status of a previously sponsored transaction.
   *
   * @param {string} sponsorId - The sponsor ID returned by `sponsor()`.
   * @returns {Promise<SponsorStatusResult>} Current status and chain details.
   */
  async status(sponsorId) {
    if (!sponsorId) throw new Error('sponsorId is required');

    const url = buildUrl(
      this.#relayerUrl,
      API_ENDPOINTS.STATUS,
      { id: sponsorId },
    );

    const res = await this.#get(url);
    return /** @type {SponsorStatusResult} */ (res);
  }

  // ---------------------------------------------------------------------------
  // Account methods
  // ---------------------------------------------------------------------------

  /**
   * Check the BNB balance of your sponsor account on the relayer.
   *
   * @returns {Promise<BalanceResult>} Balance details.
   */
  async balance() {
    const res = await this.#get(
      buildUrl(this.#relayerUrl, API_ENDPOINTS.BALANCE),
    );
    return /** @type {BalanceResult} */ (res);
  }

  /**
   * Deposit BNB into your sponsor account.
   *
   * Returns a deposit address and expected confirmation details. Send BNB
   * to the returned address on BSC to fund your account.
   *
   * @param {string} amount - Amount of BNB to deposit (human-readable, e.g. "0.5").
   * @returns {Promise<DepositResult>} Deposit instructions.
   */
  async deposit(amount) {
    if (!amount || Number(amount) <= 0) {
      throw new Error('amount must be a positive BNB value');
    }

    const body = { amount: parseBNB(amount).toString() };
    const res = await this.#post(
      API_ENDPOINTS.DEPOSIT,
      body,
    );
    return /** @type {DepositResult} */ (res);
  }

  // ---------------------------------------------------------------------------
  // Policy methods
  // ---------------------------------------------------------------------------

  /**
   * List all gas spending policies on your account.
   *
   * @returns {Promise<Policy[]>} Array of policy objects.
   */
  async policies() {
    const res = await this.#get(
      buildUrl(this.#relayerUrl, API_ENDPOINTS.POLICIES),
    );
    return /** @type {Policy[]} */ (res.policies);
  }

  /**
   * Create a new gas spending policy.
   *
   * Policies let you control how much gas is sponsored, per-transaction
   * limits, daily caps, and which contracts are eligible.
   *
   * @param {object} policy
   * @param {string} policy.name - Human-readable policy name.
   * @param {string} [policy.maxGasPerTx] - Max gas units per tx (decimal string).
   * @param {string} [policy.dailyLimit] - Daily BNB spending limit (e.g. "1.0").
   * @param {string[]} [policy.allowedContracts] - Whitelist of target contract addresses.
   * @returns {Promise<Policy>} The created policy.
   */
  async createPolicy({ name, maxGasPerTx, dailyLimit, allowedContracts }) {
    if (!name) throw new Error('policy name is required');

    const body = {
      name,
      maxGasPerTx: maxGasPerTx || undefined,
      dailyLimit: dailyLimit ? parseBNB(dailyLimit).toString() : undefined,
      allowedContracts: allowedContracts || [],
    };

    const res = await this.#post(API_ENDPOINTS.CREATE_POLICY, body);
    return /** @type {Policy} */ (res);
  }

  // ---------------------------------------------------------------------------
  // Webhook methods
  // ---------------------------------------------------------------------------

  /**
   * Manage webhook subscriptions for real-time event notifications.
   *
   * @param {'list'|'create'|'delete'} action - Webhook action.
   * @param {object} [params]
   * @param {string} [params.url] - Webhook endpoint URL (for create).
   * @param {string[]} [params.events] - Events to subscribe to (for create).
   * @param {string} [params.webhookId] - Webhook ID (for delete).
   * @returns {Promise<object>} Webhook response.
   */
  async webhooks(action = 'list', params = {}) {
    const endpoint = API_ENDPOINTS.WEBHOOKS;

    switch (action) {
      case 'list':
        return this.#get(buildUrl(this.#relayerUrl, endpoint));

      case 'create':
        if (!params.url) throw new Error('webhook url is required');
        return this.#post(endpoint, {
          url: params.url,
          events: params.events || [WebhookEvent.TX_CONFIRMED, WebhookEvent.TX_REVERTED],
        });

      case 'delete':
        if (!params.webhookId) throw new Error('webhookId is required');
        return this.#delete(
          buildUrl(this.#relayerUrl, `${endpoint}/${params.webhookId}`),
        );

      default:
        throw new Error(`Unknown webhook action: ${action}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal HTTP helpers
  // ---------------------------------------------------------------------------

  /**
   * Send a GET request to the relayer.
   * @param {string} url - Full URL.
   * @returns {Promise<any>}
   */
  async #get(url) {
    return this.#request('GET', url);
  }

  /**
   * Send a POST request to the relayer.
   * @param {string} pathOrUrl - API path or full URL.
   * @param {object} body - JSON body.
   * @returns {Promise<any>}
   */
  async #post(pathOrUrl, body) {
    const url = pathOrUrl.startsWith('http')
      ? pathOrUrl
      : buildUrl(this.#relayerUrl, pathOrUrl);
    return this.#request('POST', url, body);
  }

  /**
   * Send a DELETE request to the relayer.
   * @param {string} url - Full URL.
   * @returns {Promise<any>}
   */
  async #delete(url) {
    return this.#request('DELETE', url);
  }

  /**
   * Core request method with timeout, retries, and error mapping.
   * @param {string} method
   * @param {string} url
   * @param {object} [body]
   * @returns {Promise<any>}
   */
  async #request(method, url, body) {
    let lastError;

    for (let attempt = 0; attempt <= this.#maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.#timeout);

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.#apiKey}`,
            'X-Ewei-SDK-Version': SDK_VERSION,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        const json = await res.json().catch(() => ({}));

        if (res.ok) return json;

        // Map known error codes to typed errors
        if (res.status === 401 || res.status === 403) {
          throw new AuthenticationError();
        }
        if (json.code === 'INSUFFICIENT_BALANCE') {
          throw new InsufficientBalanceError(
            json.required || 'unknown',
            json.available || 'unknown',
          );
        }
        if (json.code === 'POLICY_VIOLATION') {
          throw new PolicyViolationError(
            json.policyId || 'unknown',
            json.reason || 'Policy check failed',
          );
        }

        throw new RelayerError(json.message || res.statusText, res.status);
      } catch (err) {
        lastError = err;

        // Don't retry authentication or policy errors
        if (
          err instanceof AuthenticationError ||
          err instanceof InsufficientBalanceError ||
          err instanceof PolicyViolationError
        ) {
          throw err;
        }

        // Abort → timeout
        if (err.name === 'AbortError') {
          lastError = new TimeoutError(this.#timeout);
        }

        // Retry on transient errors
        if (attempt < this.#maxRetries) {
          await sleep(RETRY_BACKOFF_MS * 2 ** attempt);
        }
      }
    }

    throw lastError;
  }
}

// Re-export everything consumers might need
export { SponsorStatus, PolicyType, WebhookEvent } from './types.js';
export {
  InsufficientBalanceError,
  PolicyViolationError,
  RelayerError,
  TimeoutError,
  AuthenticationError,
  EweiError,
} from './errors.js';
export {
  BSC_MAINNET,
  BSC_TESTNET,
  GAS_DEFAULTS,
  DEFAULT_RELAYER_URL,
} from './constants.js';
export {
  formatGwei,
  parseGwei,
  formatBNB,
  parseBNB,
  estimateGasCost,
  padGasLimit,
  isValidAddress,
} from './utils.js';
