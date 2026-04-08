<div align="center">
  <img src="https://raw.githubusercontent.com/eWeiBNB/ewei-sdk/main/assets/logo.png" alt="eWei" width="200" />

  <h1>eWei SDK</h1>
  <p><strong>Gas sponsorship protocol for BNB Chain</strong></p>
  <p>Let your users transact on BSC without holding BNB.</p>

  [![npm](https://img.shields.io/npm/v/@ewei/sdk?color=f0b90b&style=flat-square)](https://www.npmjs.com/package/@ewei/sdk)
  [![license](https://img.shields.io/github/license/LiquiditySolver/ewei-sdk?style=flat-square)](LICENSE)
  [![node](https://img.shields.io/node/v/@ewei/sdk?style=flat-square)](package.json)
  [![TypeScript](https://img.shields.io/badge/types-included-blue?style=flat-square)](#typescript)
</div>

---

## What is eWei?

eWei is a gas abstraction layer for **BNB Smart Chain**. dApps integrate the SDK to sponsor gas fees on behalf of their users. Users sign transactions normally — the eWei relayer wraps them in a meta-transaction, pays the gas in BNB, and submits them to the network.

**Key benefits:**

- Users never need BNB for gas — zero onboarding friction
- dApps control spending with granular policies (daily caps, per-tx limits, contract whitelists)
- Works with any BSC contract — PancakeSwap, Venus, Thena, custom contracts, plain transfers
- Full observability via webhooks and status polling

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   User App   │─────▶│  eWei SDK    │─────▶│ eWei Relayer │
│  (Frontend)  │      │  (this pkg)  │      │   (Server)   │
└──────────────┘      └──────────────┘      └──────┬───────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │  BNB Smart   │
                                            │    Chain      │
                                            └──────────────┘

1. User signs a transaction intent in the frontend
2. SDK sends the tx request to the eWei relayer
3. Relayer validates against policies, wraps in meta-tx
4. Relayer pays gas and submits to BSC
5. SDK returns sponsor ID for status tracking
```

## Quick Start

### Install

```bash
npm install @ewei/sdk ethers
```

### Sponsor a Transaction

```js
import { EweiClient } from '@ewei/sdk';

const ewei = new EweiClient({
  apiKey: process.env.EWEI_API_KEY,
});

// Sponsor a BNB transfer — user pays zero gas
const result = await ewei.sponsor({
  from: '0xUserWallet...',
  to: '0xRecipient...',
  value: '0x2386F26FC10000', // 0.01 BNB
  chainId: 56,
});

console.log(result.sponsorId); // track the tx
console.log(result.status);    // 'pending' → 'submitted' → 'confirmed'
```

### Estimate Gas Cost

```js
const estimate = await ewei.estimate({
  from: '0xUserWallet...',
  to: '0xPancakeRouter...',
  data: swapCalldata,
});

console.log(`Cost: ${estimate.totalCostBnb} BNB`);
console.log(`Can sponsor: ${estimate.canSponsor}`);
```

### Create a Spending Policy

```js
const policy = await ewei.createPolicy({
  name: 'DeFi Only',
  maxGasPerTx: '500000',
  dailyLimit: '2.0', // 2 BNB per day
  allowedContracts: [
    '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4', // PancakeSwap V3
    '0xfD36E2c2a6789Db23113685031d7F16329158384', // Venus
  ],
});

// Use the policy when sponsoring
await ewei.sponsor(txRequest, { policyId: policy.id });
```

## API Reference

### `new EweiClient(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | *required* | Your eWei API key |
| `relayerUrl` | `string` | `https://relayer.ewei.io` | Custom relayer URL |
| `timeout` | `number` | `30000` | Request timeout (ms) |
| `maxRetries` | `number` | `3` | Retry attempts for transient errors |

### Methods

| Method | Description |
|--------|-------------|
| `sponsor(txRequest, options?)` | Sponsor a transaction's gas fees |
| `estimate(txRequest)` | Estimate gas cost without submitting |
| `status(sponsorId)` | Check sponsor transaction status |
| `balance()` | Get sponsor account BNB balance |
| `deposit(amount)` | Get deposit address to fund account |
| `policies()` | List all spending policies |
| `createPolicy(params)` | Create a new spending policy |
| `webhooks(action, params?)` | Manage webhook subscriptions |

### Transaction Request

```ts
interface TxRequest {
  to: string;        // target address
  from: string;      // user wallet
  data?: string;     // calldata (hex)
  value?: string;    // BNB in Wei
  chainId?: number;  // 56 (mainnet) or 97 (testnet)
  gasLimit?: string; // override gas limit
}
```

### Errors

| Error | Code | When |
|-------|------|------|
| `InsufficientBalanceError` | `INSUFFICIENT_BALANCE` | Sponsor account can't cover gas |
| `PolicyViolationError` | `POLICY_VIOLATION` | Tx violates a spending policy |
| `RelayerError` | `RELAYER_ERROR` | Relayer returned an error |
| `TimeoutError` | `TIMEOUT` | Request timed out |
| `AuthenticationError` | `AUTH_ERROR` | Invalid or expired API key |

```js
import { InsufficientBalanceError } from '@ewei/sdk';

try {
  await ewei.sponsor(tx);
} catch (err) {
  if (err instanceof InsufficientBalanceError) {
    console.log(`Need ${err.details.required} BNB, have ${err.details.available}`);
  }
}
```

### Utilities

```js
import { formatBNB, parseBNB, formatGwei, isValidAddress } from '@ewei/sdk';

formatBNB(1000000000000000000n); // '1'
parseBNB('0.5');                  // 500000000000000000n
formatGwei(3000000000n);          // '3'
isValidAddress('0x...');          // true/false
```

## Multi-Language Examples

### Python

```python
import requests

resp = requests.post(
    "https://relayer.ewei.io/v1/sponsor",
    headers={"Authorization": f"Bearer {api_key}"},
    json={"tx": {"from": user, "to": recipient, "value": "0x2386F26FC10000", "chainId": 56}},
)
print(resp.json()["sponsorId"])
```

See full example: [`examples/python/sponsor.py`](examples/python/sponsor.py)

### Go

```go
client := NewClient(os.Getenv("EWEI_API_KEY"))
result, _ := client.Sponsor(TxRequest{
    From:    "0xUser...",
    To:      "0xRecipient...",
    Value:   "0x2386F26FC10000",
    ChainID: 56,
})
fmt.Println(result.SponsorID)
```

See full example: [`examples/go/main.go`](examples/go/main.go)

### cURL

```bash
curl -X POST https://relayer.ewei.io/v1/sponsor \
  -H "Authorization: Bearer $EWEI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tx":{"from":"0xUser","to":"0xRecipient","value":"0x2386F26FC10000","chainId":56}}'
```

## TypeScript

Full type declarations are included. No `@types` package needed.

```ts
import { EweiClient, type SponsorResult, type GasEstimate } from '@ewei/sdk';
```

## Supported Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| BNB Smart Chain | 56 | Supported |
| BSC Testnet | 97 | Supported |

## License

[MIT](LICENSE) - Copyright (c) 2026 eWei
