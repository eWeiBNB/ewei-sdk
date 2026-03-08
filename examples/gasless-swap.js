/**
 * eWei SDK — Gasless PancakeSwap Swap
 *
 * Sponsor a token swap on PancakeSwap V3 so the user pays zero gas.
 * The user signs the swap intent; eWei relayer pays the gas.
 *
 * Usage:
 *   EWEI_API_KEY=ek_live_... node examples/gasless-swap.js
 */

import { EweiClient, SponsorStatus, GAS_DEFAULTS } from '@ewei/sdk';
import { ethers } from 'ethers';

// PancakeSwap V3 Router on BSC
const PANCAKE_ROUTER = '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4';
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const USDT = '0x55d398326f99059fF775485246999027B3197955';

const ewei = new EweiClient({
  apiKey: process.env.EWEI_API_KEY,
});

async function main() {
  const userWallet = '0xYourUserWalletAddress';

  // Encode PancakeSwap V3 exactInputSingle calldata
  const routerAbi = [
    'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  ];

  const iface = new ethers.Interface(routerAbi);
  const swapCalldata = iface.encodeFunctionData('exactInputSingle', [{
    tokenIn: WBNB,
    tokenOut: USDT,
    fee: 2500,                                    // 0.25% fee tier
    recipient: userWallet,
    amountIn: ethers.parseEther('0.1'),           // swap 0.1 BNB
    amountOutMinimum: ethers.parseUnits('25', 18), // min ~25 USDT out
    sqrtPriceLimitX96: 0n,
  }]);

  // Build the transaction request
  const txRequest = {
    from: userWallet,
    to: PANCAKE_ROUTER,
    data: swapCalldata,
    value: ethers.parseEther('0.1').toString(),    // sending BNB with the swap
    chainId: 56,
  };

  // Estimate first
  const estimate = await ewei.estimate(txRequest);
  console.log(`Swap gas estimate: ${estimate.totalCostBnb} BNB`);

  // Sponsor the swap
  const result = await ewei.sponsor(txRequest);
  console.log(`Sponsored! ID: ${result.sponsorId}`);

  // Wait for confirmation
  let status = result;
  while (
    status.status === SponsorStatus.PENDING ||
    status.status === SponsorStatus.SUBMITTED
  ) {
    await new Promise((r) => setTimeout(r, 3000));
    status = await ewei.status(result.sponsorId);
  }

  if (status.status === SponsorStatus.CONFIRMED) {
    console.log(`Swap confirmed: https://bscscan.com/tx/${status.txHash}`);
    console.log(`Gas used: ${status.gasUsed}`);
  } else {
    console.error(`Swap ${status.status}`);
  }
}

main().catch(console.error);
