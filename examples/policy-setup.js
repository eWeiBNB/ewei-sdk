/**
 * eWei SDK — Policy Management
 *
 * Create and manage gas spending policies to control sponsorship costs.
 *
 * Usage:
 *   EWEI_API_KEY=ek_live_... node examples/policy-setup.js
 */

import { EweiClient, formatBNB, parseBNB } from '@ewei/sdk';

const PANCAKE_ROUTER = '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4';
const VENUS_COMPTROLLER = '0xfD36E2c2a6789Db23113685031d7F16329158384';
const THENA_ROUTER = '0xd4ae6eCA985340Dd434D38F470aCCce4DC78D109';

const ewei = new EweiClient({
  apiKey: process.env.EWEI_API_KEY,
});

async function main() {
  // -------------------------------------------------------------------------
  // 1. List existing policies
  // -------------------------------------------------------------------------
  const existing = await ewei.policies();
  console.log(`\nExisting policies (${existing.length}):`);
  for (const p of existing) {
    console.log(`  [${p.id}] ${p.name} — active: ${p.active}`);
    if (p.dailyLimit) {
      console.log(`    Daily limit: ${formatBNB(BigInt(p.dailyLimit))} BNB (used: ${formatBNB(BigInt(p.dailyUsed))} BNB)`);
    }
  }

  // -------------------------------------------------------------------------
  // 2. Create a DEX-only policy
  //    Only sponsors gas for PancakeSwap, Venus, and Thena contracts.
  //    Max 500k gas per tx, 2 BNB daily cap.
  // -------------------------------------------------------------------------
  const dexPolicy = await ewei.createPolicy({
    name: 'DeFi Protocols Only',
    maxGasPerTx: '500000',
    dailyLimit: '2.0',
    allowedContracts: [
      PANCAKE_ROUTER,
      VENUS_COMPTROLLER,
      THENA_ROUTER,
    ],
  });
  console.log(`\nCreated policy: ${dexPolicy.name} (${dexPolicy.id})`);

  // -------------------------------------------------------------------------
  // 3. Create a low-cost transfer policy
  //    For simple BNB/token transfers — tight gas limit, small daily cap.
  // -------------------------------------------------------------------------
  const transferPolicy = await ewei.createPolicy({
    name: 'Transfers Only',
    maxGasPerTx: '65000',
    dailyLimit: '0.5',
    allowedContracts: [],       // empty = any contract allowed
  });
  console.log(`Created policy: ${transferPolicy.name} (${transferPolicy.id})`);

  // -------------------------------------------------------------------------
  // 4. Use a policy when sponsoring a transaction
  // -------------------------------------------------------------------------
  const txRequest = {
    from: '0xUserWallet',
    to: PANCAKE_ROUTER,
    data: '0x...',              // encoded swap calldata
    chainId: 56,
  };

  const result = await ewei.sponsor(txRequest, {
    policyId: dexPolicy.id,    // enforce the DeFi policy
  });
  console.log(`\nSponsored under policy "${dexPolicy.name}": ${result.sponsorId}`);

  // -------------------------------------------------------------------------
  // 5. Set up a webhook for policy limit alerts
  // -------------------------------------------------------------------------
  const webhook = await ewei.webhooks('create', {
    url: 'https://your-app.com/webhooks/ewei',
    events: ['policy.limit_reached', 'balance.low'],
  });
  console.log(`\nWebhook created: ${webhook.id}`);
  console.log(`  URL: ${webhook.url}`);
  console.log(`  Events: ${webhook.events.join(', ')}`);
}

main().catch(console.error);
