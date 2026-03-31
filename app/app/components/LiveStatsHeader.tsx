"use client";

import { UserMetrics } from "@/lib/db";
import { formatCurrency } from "@/lib/stellar";

export default function LiveStatsHeader({ metrics }: { metrics: UserMetrics | null }) {
  if (!metrics) return null;
  
  return (
    <div className="w-full bg-indigo-950/30 border-b border-indigo-500/10 py-2 overflow-hidden whitespace-nowrap relative z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-12 text-[11px] font-bold uppercase tracking-widest text-indigo-300/60">
        <div className="flex items-center gap-2">
          <span className="text-white">{metrics.totalUsers}</span> Active Traders
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white">{formatCurrency(metrics.totalVolume)}</span> Total Volume
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-emerald-400">⚡ Gasless Trading Enabled</span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-white">{metrics.totalTrades}</span> Successful Predictions
        </div>
      </div>
    </div>
  );
}
