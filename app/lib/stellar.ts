/**
 * Stellar / Soroban service layer.
 * Handles wallet connection via Freighter v6 and simulated contract interactions.
 */

import {
  isConnected,
  requestAccess,
  getAddress,
  isAllowed,
  signTransaction as signWithFreighter,
} from "@stellar/freighter-api";
import albedo from "@albedo-link/intent";
import { TransactionBuilder, Account, Operation, Networks, Transaction, Horizon } from "@stellar/stellar-sdk";

export type WalletType = "freighter" | "albedo" | "xbull";

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  network: string;
}

// Check if Freighter extension is installed with 500ms retry loop
export async function isFreighterAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  
  // 1. First try: Direct check for window objects
  if (!!(window as any).stellar || !!(window as any).freighter) return true;

  // 2. Retry loop for 500ms (to handle extension loading delay)
  const start = Date.now();
  while (Date.now() - start < 500) {
    try {
      const res = await isConnected();
      if (typeof res === "boolean" && res) return true;
      if (res && typeof res === "object" && "isConnected" in res && res.isConnected) return true;
    } catch (e) {}

    // Fallback window check during loop
    if (!!(window as any).stellar || !!(window as any).freighter) return true;
    
    await new Promise(r => setTimeout(r, 100)); // wait 100ms before next try
  }

  return false;
}

// Connect wallet — opens popup for user approval based on wallet type
export async function connectWallet(type: WalletType = "freighter"): Promise<string> {
  if (type === "freighter") {
    // 300ms initial delay for UI smoothness
    await new Promise(r => setTimeout(r, 300));
    
    const available = await isFreighterAvailable();
    if (!available) {
      throw new Error("Freighter wallet not found. Please ensure it is installed and enabled in your browser.");
    }

    try {
      const res = await requestAccess();
      if (res.error) throw new Error(res.error);
      if (!res.address) throw new Error("Could not retrieve wallet address.");
      return res.address;
    } catch (e: any) {
      throw new Error(e.message || "Freighter connection failed.");
    }
  } else if (type === "albedo") {
    const res = await albedo.publicKey({
      token: "stellar-predict-auth",
    });
    if (!res.pubkey) throw new Error("Albedo connection rejected.");
    return res.pubkey;
  } else if (type === "xbull") {
    const xbull = (window as any).xBullWallet;
    if (!xbull) throw new Error("xBULL wallet not found. Please install the xBULL extension.");
    const addresses = await xbull.getPublicKey();
    if (!addresses || addresses.length === 0) throw new Error("xBULL connection rejected.");
    return addresses[0];
  }
  throw new Error("Unsupported wallet type.");
}

// Get connected wallet address silently (no popup)
// v6 getAddress returns { address: string, error?: string }
export async function getWalletAddress(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const allowed = await isAllowed();
    if (!allowed.isAllowed) return null;
    const res = await getAddress();
    if (res.error || !res.address) return null;
    return res.address;
  } catch {
    return null;
  }
}

// Shorten address for display
export function shortenAddress(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

// Simulate AMM price calculation (Constant Product formula)
// Given YES reserve, NO reserve, and collateral in → returns YES tokens out
export function calcBuyYes(
  reserveYes: number,
  reserveNo: number,
  collateralIn: number,
  feeBps = 100 // 1%
): { yesOut: number; priceImpact: number; newYesPrice: number } {
  const amountInWithFee = collateralIn * (10000 - feeBps) / 10000;
  const yesFromPool = reserveYes - (reserveYes * reserveNo) / (reserveNo + amountInWithFee);
  const totalYesOut = collateralIn + yesFromPool;

  const oldYesPrice = reserveNo / (reserveYes + reserveNo);
  const newReserveYes = reserveYes - yesFromPool;
  const newReserveNo = reserveNo + amountInWithFee;
  const newYesPrice = newReserveNo / (newReserveYes + newReserveNo);

  const priceImpact = Math.abs((newYesPrice - oldYesPrice) / oldYesPrice) * 100;
  return { yesOut: totalYesOut, priceImpact, newYesPrice };
}

// Simulate AMM sell YES → collateral out
export function calcSellYes(
  reserveYes: number,
  reserveNo: number,
  collateralOut: number,
  feeBps = 100
): { yesIn: number; priceImpact: number; newYesPrice: number } {
  if (collateralOut >= reserveNo) return { yesIn: Infinity, priceImpact: 100, newYesPrice: 0 };
  const xFee = (reserveYes * reserveNo) / (reserveNo - collateralOut) - reserveYes;
  const x = xFee / (1 - feeBps / 10000);
  const yesIn = x + collateralOut;
  const oldYesPrice = reserveNo / (reserveYes + reserveNo);
  const newReserveYes = reserveYes + x;
  const newReserveNo = reserveNo - collateralOut;
  const newYesPrice = newReserveNo / (newReserveYes + newReserveNo);
  const priceImpact = Math.abs((newYesPrice - oldYesPrice) / oldYesPrice) * 100;
  return { yesIn, priceImpact, newYesPrice };
}

// Simulate AMM buy NO → collateral in
export function calcBuyNo(
  reserveYes: number,
  reserveNo: number,
  collateralIn: number,
  feeBps = 100
): { noOut: number; priceImpact: number; newYesPrice: number } {
  const amountInWithFee = collateralIn * (10000 - feeBps) / 10000;
  const noFromPool = reserveNo - (reserveYes * reserveNo) / (reserveYes + amountInWithFee);
  const totalNoOut = collateralIn + noFromPool;

  const oldNoPrice = reserveYes / (reserveYes + reserveNo);
  const newReserveNo = reserveNo - noFromPool;
  const newReserveYes = reserveYes + amountInWithFee;
  const newNoPrice = newReserveYes / (newReserveYes + newReserveNo);
  const newYesPrice = 1 - newNoPrice; // yesPrice + noPrice = 1

  const priceImpact = Math.abs((newNoPrice - oldNoPrice) / oldNoPrice) * 100;
  return { noOut: totalNoOut, priceImpact, newYesPrice };
}

export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function formatProbability(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

// Simulate submitting a trade (in a real app this would call Soroban)
export async function submitTrade(params: {
  contractAddress: string;
  action: "buy_yes" | "buy_no" | "sell_yes" | "add_liquidity";
  amount: number;
  walletAddress: string;
  walletType: WalletType;
}): Promise<{ txHash: string; message: string }> {
  try {
    const server = new Horizon.Server("https://horizon-testnet.stellar.org");
    
    // 1. Fetch the real sequence number for the user's wallet
    const account = await server.loadAccount(params.walletAddress);
    
    // 2. Build the transaction using an on-chain activity signature (manageData)
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: params.contractAddress,
          function: "submit_prediction_" + params.action.toUpperCase(),
          args: [],
        })
      )
      .setTimeout(30)
      .build();

    const xdr = tx.toXDR();
    let signedXdr: string;

    // 3. Trigger signing based on wallet type
    if (params.walletType === "freighter") {
      const response = await signWithFreighter(xdr, { networkPassphrase: Networks.TESTNET });
      if (response.error) throw new Error(response.error);
      signedXdr = response.signedTxXdr || "";
    } else if (params.walletType === "albedo") {
      const response = await albedo.tx({ xdr, network: "testnet" });
      signedXdr = response.signed_envelope_xdr || "";
    } else if (params.walletType === "xbull") {
      const xbull = (window as any).xBullWallet;
      signedXdr = await xbull.sign({ xdr, network: Networks.TESTNET });
    } else {
      throw new Error("Unknown wallet type");
    }

    if (!signedXdr) throw new Error("Transaction was not signed.");

    // 4. Submit the signed transaction to the Stellar Testnet
    const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET) as Transaction;
    const submitResponse = await server.submitTransaction(signedTx);
    
    // Generate nice customized success message for the user based on action
    let message = "Transaction successful!";
    if (params.action === "buy_yes") message = "Congratulations! Successfully bought YES tokens! 🚀";
    if (params.action === "buy_no") message = "Congratulations! Successfully bought NO tokens! 🚀";
    if (params.action === "sell_yes") message = "Successfully sold your position! 💸";
    if (params.action === "add_liquidity") message = "Awesome! Liquidity added to the pool! 💧";

    // Use the real transaction hash from the network response
    const finalHash = submitResponse.hash;

    return { txHash: finalHash, message };
  } catch (error: any) {
    throw new Error(error.message || "Wallet transaction failed or was rejected.");
  }
}
