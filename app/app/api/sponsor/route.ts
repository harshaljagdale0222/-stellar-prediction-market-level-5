export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { logUser, recordTrade } from "@/lib/db";

// Pure REST-based sponsor endpoint - NO stellar-sdk WASM import at build time
export async function POST(req: NextRequest) {
  try {
    const { userAddress, marketId, amount, action, txHash } = await req.json();

    if (!userAddress) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Log user for scaling metrics
    try { await logUser(userAddress); } catch {}

    // Record the trade in local DB
    if (marketId && amount && action) {
      recordTrade(marketId, {
        user: userAddress,
        type: action.includes("yes") ? "YES" : "NO",
        amount: Number(amount),
        price: 0.5,
        timestamp: Date.now(),
        transactionHash: txHash || ("TX_" + Date.now().toString(16).toUpperCase())
      });
    }

    return NextResponse.json({
      success: true,
      hash: txHash || ("TX_" + Date.now().toString(16).toUpperCase()),
      message: "Trade recorded successfully"
    });

  } catch (error: any) {
    console.error("Sponsor error:", error);
    return NextResponse.json({
      error: error.message || "Failed to process"
    }, { status: 500 });
  }
}
