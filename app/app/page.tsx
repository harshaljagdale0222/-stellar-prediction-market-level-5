"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MarketMeta } from "@/lib/db";
import { formatCurrency, shortenAddress } from "@/lib/stellar";
import WalletModal from "@/app/components/WalletModal";
import { useWallet } from "@/app/context/WalletContext";

// ──────────────────────────────────────────────────────────────────────────────
// Toast Notification
// ──────────────────────────────────────────────────────────────────────────────


// ──────────────────────────────────────────────────────────────────────────────
// Navbar
// ──────────────────────────────────────────────────────────────────────────────
function Navbar({ address, onOpenModal }: { address: string | null; onOpenModal: () => void }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-sm font-bold">
            ⭐
          </div>
          <span className="font-bold text-lg tracking-tight gradient-text">StellarPredict</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">Markets</Link>
          <Link href="/create" className="hover:text-white transition-colors">Create Market</Link>
          <a href="#" className="hover:text-white transition-colors">Portfolio</a>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="pulse-dot" />
            <span>Testnet</span>
          </div>
          {address ? (
            <div className="glass px-3 py-1.5 rounded-full text-sm text-violet-300 font-mono border border-violet-500/30">
              {shortenAddress(address)}
            </div>
          ) : (
            <button
              onClick={onOpenModal}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Stats Bar
// ──────────────────────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: any }) {
  const items = [
    { label: "Total Markets", value: stats?.totalMarkets ?? "—" },
    { label: "Active", value: stats?.activeMarkets ?? "—" },
    { label: "Total Volume", value: stats ? formatCurrency(stats.totalVolume) : "—" },
    { label: "Total Liquidity", value: stats ? formatCurrency(stats.totalLiquidity) : "—" },
  ];
  return (
    <div className="glass border-b border-white/5 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-6 h-12 flex items-center gap-8 overflow-x-auto text-sm">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 shrink-0">
            <span className="text-slate-500">{item.label}:</span>
            <span className="text-white font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Card
// ──────────────────────────────────────────────────────────────────────────────
function MarketCard({ market }: { market: MarketMeta }) {
  const yesPercent = Math.round(market.yesPrice * 100);
  const noPercent = 100 - yesPercent;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000)
  );

  const categoryColors: Record<string, string> = {
    Crypto: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    Sports: "text-green-400 bg-green-400/10 border-green-400/20",
    Climate: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    Politics: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    Other: "text-slate-400 bg-slate-400/10 border-slate-400/20",
  };
  const catStyle = categoryColors[market.category] ?? categoryColors.Other;

  return (
    <Link href={`/markets/${market.id}`}>
      <div className="glass rounded-2xl p-5 hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/10 group cursor-pointer h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-white/10 flex items-center justify-center text-2xl shrink-0">
            {market.emoji}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${catStyle}`}>
              {market.category}
            </span>
            {!market.resolved && (
              <span className="text-xs text-slate-500">{daysLeft}d left</span>
            )}
            {market.resolved && (
              <span className="text-xs text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-full border border-violet-400/20 font-medium">
                Resolved: {market.outcome}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-slate-100 leading-snug mb-4 flex-1 group-hover:text-white transition-colors">
          {market.title}
        </h3>

        {/* Probability Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-cyan-400 font-bold">{yesPercent}% YES</span>
            <span className="text-pink-400 font-bold">{noPercent}% NO</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-700"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/5 space-y-3">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
            <span>Sentiment Support</span>
            <span className="text-slate-400">{formatCurrency(market.yesVolume + market.noVolume)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="glass rounded-lg py-1 px-2 border border-cyan-500/10">
              <p className="text-[10px] text-cyan-400 font-bold mb-0.5">YES Support</p>
              <p className="text-xs text-white font-mono font-bold">{formatCurrency(market.yesVolume)}</p>
            </div>
            <div className="glass rounded-lg py-1 px-2 border-pink-500/10 border">
              <p className="text-[10px] text-pink-400 font-bold mb-0.5">NO Support</p>
              <p className="text-xs text-white font-mono font-bold">{formatCurrency(market.noVolume)}</p>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Vol: <span className="text-slate-300">{formatCurrency(market.volume)}</span></span>
            <span>Liq: <span className="text-slate-300">{formatCurrency(market.liquidity)}</span></span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Hero
// ──────────────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <div className="relative text-center py-24 px-4 overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-sm text-violet-300 mb-6 border border-violet-500/20">
          <span className="pulse-dot !w-2 !h-2" />
          Powered by Stellar Soroban
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
          <span className="gradient-text">Predict the Future.</span>
          <br />
          <span className="text-white">Earn Real Rewards.</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8">
          Trade on real-world events using a fully decentralized AMM on Stellar. No middlemen — just math and markets.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="#markets"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25"
          >
            Explore Markets
          </Link>
          <Link
            href="/create"
            className="px-6 py-3 rounded-xl glass border border-white/10 text-slate-200 font-semibold hover:border-violet-400/40 transition-all"
          >
            Create Market
          </Link>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [markets, setMarkets] = useState<MarketMeta[]>([]);
  const [stats, setStats] = useState<any>(null);
  const { address, disconnect } = useWallet();
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/markets").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
    ]).then(([mData, sData]) => {
      setMarkets(mData.markets ?? []);
      setStats(sData.stats);
      setLoading(false);
    });
  }, []);

  const categories = ["All", ...Array.from(new Set(markets.map((m) => m.category)))];
  const filtered = filter === "All" ? markets : markets.filter((m) => m.category === filter);

  return (
    <div className="min-h-screen grid-bg">
      <Navbar address={address} onOpenModal={() => setShowWalletModal(true)} />
      <StatsBar stats={stats} />
      {showWalletModal && (
        <WalletModal
          onClose={() => setShowWalletModal(false)}
        />
      )}

      <main className="max-w-7xl mx-auto px-6">
        <Hero />

        {/* Filter Pills */}
        <div id="markets" className="flex items-center gap-2 mb-6 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${filter === cat
                ? "bg-violet-600 border-violet-500 text-white"
                : "glass border-white/10 text-slate-400 hover:border-violet-400/30 hover:text-slate-200"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Markets Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-16">
            {filtered.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
