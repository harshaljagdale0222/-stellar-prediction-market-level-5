import { NextResponse } from "next/server";
import { getAllMarkets, createMarket } from "@/lib/db";

export async function GET() {
  const markets = getAllMarkets();
  return NextResponse.json({ markets });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { contractAddress, title, description, category, emoji, endDate } = body;

  if (!contractAddress || !title || !endDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const market = createMarket({
    contractAddress,
    title,
    description: description ?? "",
    category: category ?? "Other",
    emoji: emoji ?? "🔮",
    endDate,
    yesPrice: 0.5,
    noPrice: 0.5,
    yesVolume: 0,
    noVolume: 0,
    volume: 0,
    liquidity: 0,
    resolved: false,
  });

  return NextResponse.json({ market }, { status: 201 });
}
