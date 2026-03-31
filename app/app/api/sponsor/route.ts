import { NextRequest, NextResponse } from "next/server";
import * as StellarSdk from "@stellar/stellar-sdk";
import { logUser, recordTrade } from "@/lib/db";

const SPONSOR_SECRET = process.env.SPONSOR_SECRET_KEY || "SAHQMKZUKG6SRE5NDFUT7L4P2G6RYE6RYE6RYE6RYE6RYE6RYE6RYE6R"; // Use a real key in production
const SPONSOR_KEYPAIR = StellarSdk.Keypair.fromSecret(SPONSOR_SECRET);

export async function POST(req: NextRequest) {
  try {
    const { xdr, userAddress, marketId, amount, action } = await req.json();

    if (!xdr || !userAddress) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1. Build the Fee-Bump Transaction
    const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
    const innerTx = StellarSdk.TransactionBuilder.fromXDR(xdr, StellarSdk.Networks.TESTNET) as StellarSdk.Transaction;
    
    // Fee-bump transaction
    const feeBumpTx = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
      SPONSOR_KEYPAIR,
      StellarSdk.BASE_FEE,
      innerTx,
      StellarSdk.Networks.TESTNET
    );

    feeBumpTx.sign(SPONSOR_KEYPAIR);

    // 2. Submit to Horizon
    const result = await server.submitTransaction(feeBumpTx);

    // 3. Log user for scaling metrics
    await logUser(userAddress);

    // 4. Record the trade in local DB
    if (marketId && amount && action) {
      recordTrade(marketId, {
        user: userAddress,
        type: action.includes("yes") ? "YES" : "NO",
        amount: Number(amount),
        price: 0.5, // Estimated, in a real app this would come from the contract state
        timestamp: Date.now(),
        transactionHash: result.hash
      });
    }

    return NextResponse.json({ 
      success: true, 
      hash: result.hash,
      ledger: result.ledger
    });

  } catch (error: any) {
    console.error("Sponsorship error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to sponsor transaction" 
    }, { status: 500 });
  }
}
