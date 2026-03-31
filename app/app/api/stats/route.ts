import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/db";

export async function GET() {
  try {
    const stats = getMetrics();
    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
