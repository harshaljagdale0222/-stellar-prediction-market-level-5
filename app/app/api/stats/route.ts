import { NextResponse } from "next/server";
import { getAllMarkets } from "@/lib/db";

export async function GET() {
  const markets = getAllMarkets();
  const totalVolume = markets.reduce((s, m) => s + m.volume, 0);
  const totalLiquidity = markets.reduce((s, m) => s + m.liquidity, 0);
  const activeMarkets = markets.filter((m) => !m.resolved).length;
  return NextResponse.json({
    stats: {
      totalMarkets: markets.length,
      activeMarkets,
      totalVolume,
      totalLiquidity,
    },
  });
}
