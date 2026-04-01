import { NextResponse } from "next/server";
import { getMarketById, updateMarket, recordTrade } from "@/lib/db";

export async function GET(_: Request, { params }: { params: any }) {
  const id = params?.id || (await params)?.id;
  if (!id) return NextResponse.json({ error: "No market ID provided" }, { status: 400 });
  const market = getMarketById(id);
  if (!market) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ market });
}

export async function PATCH(req: Request, { params }: { params: any }) {
  try {
    const id = params?.id || (await params)?.id;
    if (!id) return NextResponse.json({ error: "No market ID provided" }, { status: 400 });
    const body = await req.json();

    // If this is a trade operation
    if (body.userAddress && (body.action?.includes("buy") || body.action?.includes("sell"))) {
      const market = getMarketById(id);
      if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });

      // Record the trade properly in the trades array
      recordTrade(id, {
        user: body.userAddress,
        type: body.action.includes("yes") ? "YES" : "NO",
        amount: Number(body.amount),
        price: body.price || (body.action.includes("yes") ? market.yesPrice : market.noPrice),
        timestamp: Date.now(),
        transactionHash: body.txHash
      });

      // Update global market stats
      updateMarket(id, {
        volume: market.volume + Number(body.amount),
        yesVolume: body.action.includes("yes") ? market.yesVolume + Number(body.amount) : market.yesVolume,
        noVolume: body.action.includes("no") ? market.noVolume + Number(body.amount) : market.noVolume,
        yesPrice: body.newYesPrice || market.yesPrice,
        noPrice: body.newNoPrice || market.noPrice
      });

      return NextResponse.json({ success: true });
    }

    // Handle direct market updates (like resolution)
    const updated = updateMarket(id, body);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ market: updated });

  } catch (error: any) {
    console.error("API ROUTE PATCH ERROR:", error);
    return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
  }
}
