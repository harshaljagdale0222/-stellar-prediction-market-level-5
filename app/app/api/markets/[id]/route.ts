import { NextResponse } from "next/server";
import { getMarketById, updateMarket } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const market = getMarketById(id);
  if (!market) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ market });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = updateMarket(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ market: updated });
}
