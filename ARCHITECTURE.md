# StellarPredict Architecture Document

## Overview
StellarPredict is a fully decentralized prediction market built on the Stellar Soroban blockchain. It facilitates trustless betting on binary outcomes (YES/NO) related to real-world events.

## System Architecture

### 1. Frontend (Next.js 14 & App Router)
The user interface is built using Next.js 14 and React.
- **State Management:** Handled via a global `WalletContext` to maintain wallet session persistence across all pages.
- **Styling:** Tailwind CSS with a custom Glassmorphism aesthetic.
- **Wallet Connection:** Supports three major wallet providers: `Freighter` (Extension), `Albedo` (Web-based), and `xBULL` (Advanced Extension). 

### 2. Smart Contracts (Soroban)
Our core on-chain logic relies entirely on Stellar's new Soroban smart contract environment.
- **Factory Pattern (To be deployed):** A factory contract is responsible for instantiating new child prediction markets to isolate liquidity.
- **Automated Market Maker (AMM):** We use a Constant Product Market Maker (CPMM) pricing algorithm: `k = Reserve_Yes * Reserve_No`. This naturally discovers the equilibrium price of any outcome based on participant trading volume.
- **Collateral Management:** USDC is the base token used for placing odds. Winnings are distributed fully automatically via the smart contracts once resolution occurs.

### 3. Data Flow
1. **User Action:** The user selects an outcome (e.g., YES) and initiates a trade.
2. **Local Quoting:** The frontend calculates local quotation and price impact (slippage) based on current reserves.
3. **Transaction Building:** An XDR transaction payload is generated containing the Soroban generic smart contract invocation parameters.
4. **Wallet Signing:** The XDR is passed to the selected Wallet Provider (Freighter/Albedo/xBULL) for user cryptographic signature.
5. **Network Submission:** Signed XDR is submitted to the Stellar RPC node.

## Smart Contract States
- `Active`: Market is live and accepting trades.
- `Resolved`: Outcome determined. All trading halted. Winning shares are redeemable exactly at 1 USDC. Losing shares are 0 USDC.

## Token Economics & Liquidity
To provide immediate trading possibilities upon market creation, a fixed percentage of initially deposited USDC is converted into equivalent initial AMM reserves. A small swap fee (1%) is charged on trades to incentivize Liquidity Providers (LPs).
