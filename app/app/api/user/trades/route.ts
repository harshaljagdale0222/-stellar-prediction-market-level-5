import { NextRequest, NextResponse } from "next/server";
import { getUserTrades } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const trades = getUserTrades(address);

    return NextResponse.json({
      success: true,
      trades: trades,
      count: trades.length
    });
  } catch (error: any) {
    console.error("Fetch trades error:", error);
    return NextResponse.json({ error: "Failed to fetch trade history" }, { status: 500 });
  }
}
