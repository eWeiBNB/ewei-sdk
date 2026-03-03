/**
 * eWei SDK — Basic Example
 *
 * Sponsor a simple BNB transfer so the sender pays zero gas.
 *
 * Usage:
 *   EWEI_API_KEY=ek_live_... node examples/basic.js
 */

import { EweiClient, SponsorStatus } from '@ewei/sdk';

const ewei = new EweiClient({
  apiKey: process.env.EWEI_API_KEY,
});

async function main() {
  // 1. Check sponsor account balance
  const { balanceBnb } = await ewei.balance();
  console.log(`Sponsor balance: ${balanceBnb} BNB`);

  // 2. Define a simple BNB transfer
  const txRequest = {
    from: '0xYourUserWalletAddress',                    // user who wants to send
    to: '0xRecipientAddress',                            // recipient
    value: '0x2386F26FC10000',                           // 0.01 BNB in hex Wei
    data: '0x',                                          // no calldata for a plain transfer
    chainId: 56,                                         // BSC mainnet
  };

  // 3. Estimate gas cost before sponsoring
  const estimate = await ewei.estimate(txRequest);
  console.log(`Estimated gas: ${estimate.gasUnits} units`);
  console.log(`Estimated cost: ${estimate.totalCostBnb} BNB`);

  if (!estimate.canSponsor) {
    console.error('Insufficient sponsor balance. Deposit more BNB.');
    process.exit(1);
  }

  // 4. Sponsor the transaction
  const result = await ewei.sponsor(txRequest);
  console.log(`Sponsor ID: ${result.sponsorId}`);
  console.log(`Status: ${result.status}`);

  // 5. Poll for confirmation
  let current = result;
  while (
    current.status === SponsorStatus.PENDING ||
    current.status === SponsorStatus.SUBMITTED
  ) {
    await new Promise((r) => setTimeout(r, 3000));
    current = await ewei.status(result.sponsorId);
    console.log(`Status: ${current.status}`);
  }

  if (current.status === SponsorStatus.CONFIRMED) {
    console.log(`Confirmed! Tx hash: ${current.txHash}`);
    console.log(`View on BscScan: https://bscscan.com/tx/${current.txHash}`);
  } else {
    console.error(`Transaction ${current.status}: check sponsor ID ${result.sponsorId}`);
  }
}

main().catch(console.error);
