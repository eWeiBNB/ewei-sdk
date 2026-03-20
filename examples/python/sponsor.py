"""
eWei Gas Sponsorship — Python Example

Sponsor a BNB transfer using the eWei REST API directly from Python.
No SDK needed — just plain HTTP requests.

Usage:
    EWEI_API_KEY=ek_live_... python examples/python/sponsor.py
"""

import os
import time
import requests

EWEI_API_KEY = os.environ["EWEI_API_KEY"]
RELAYER_URL = os.environ.get("EWEI_RELAYER_URL", "https://relayer.ewei.io")

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {EWEI_API_KEY}",
}


def check_balance() -> dict:
    """Check the sponsor account balance."""
    resp = requests.get(f"{RELAYER_URL}/v1/account/balance", headers=HEADERS)
    resp.raise_for_status()
    return resp.json()


def estimate_gas(tx: dict) -> dict:
    """Estimate gas for a transaction."""
    resp = requests.post(
        f"{RELAYER_URL}/v1/estimate",
        headers=HEADERS,
        json={"tx": tx},
    )
    resp.raise_for_status()
    return resp.json()


def sponsor_tx(tx: dict, policy_id: str | None = None) -> dict:
    """Submit a transaction for gas sponsorship."""
    body = {"tx": tx}
    if policy_id:
        body["policyId"] = policy_id

    resp = requests.post(
        f"{RELAYER_URL}/v1/sponsor",
        headers=HEADERS,
        json=body,
    )
    resp.raise_for_status()
    return resp.json()


def get_status(sponsor_id: str) -> dict:
    """Poll the status of a sponsored transaction."""
    resp = requests.get(
        f"{RELAYER_URL}/v1/sponsor/{sponsor_id}/status",
        headers=HEADERS,
    )
    resp.raise_for_status()
    return resp.json()


def main():
    # 1. Check balance
    balance = check_balance()
    print(f"Sponsor balance: {balance['balanceBnb']} BNB")

    # 2. Define a simple BNB transfer on BSC
    tx = {
        "from": "0xYourUserWalletAddress",
        "to": "0xRecipientAddress",
        "value": "0x2386F26FC10000",  # 0.01 BNB
        "data": "0x",
        "chainId": 56,
    }

    # 3. Estimate gas
    est = estimate_gas(tx)
    print(f"Estimated cost: {est['totalCostBnb']} BNB")

    if not est["canSponsor"]:
        print("ERROR: Insufficient sponsor balance.")
        return

    # 4. Sponsor the transaction
    result = sponsor_tx(tx)
    sponsor_id = result["sponsorId"]
    print(f"Sponsor ID: {sponsor_id}")

    # 5. Poll until confirmed
    terminal = {"confirmed", "reverted", "rejected", "expired"}
    while result["status"] not in terminal:
        time.sleep(3)
        result = get_status(sponsor_id)
        print(f"Status: {result['status']}")

    if result["status"] == "confirmed":
        tx_hash = result["txHash"]
        print(f"Confirmed! https://bscscan.com/tx/{tx_hash}")
    else:
        print(f"Transaction {result['status']}")


if __name__ == "__main__":
    main()
