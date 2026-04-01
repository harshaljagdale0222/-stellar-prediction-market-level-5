"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MarketMeta, UserMetrics } from "@/lib/db";
import { formatCurrency, shortenAddress } from "@/lib/stellar";
import WalletModal from "@/app/components/WalletModal";
import Navbar from "@/app/components/Navbar";
import LiveStatsHeader from "@/app/components/LiveStatsHeader";
import { useWallet } from "@/app/context/WalletContext";

// ──────────────────────────────────────────────────────────────────────────────
// Market Card
// ──────────────────────────────────────────────────────────────────────────────
function MarketCard({ market }: { market: MarketMeta }) {
  const yesPercent = Math.round(market.yesPrice * 100);
  const noPercent = 100 - yesPercent;

  // AI Image Map
  const imageMap: Record<string, string> = {
    "Crypto": "/assets/images/crypto.png",
    "Sports": "/assets/images/sports.png",
    "Climate": "/assets/images/climate.png"
  };

  const bannerImg = imageMap[market.category] || "/assets/images/crypto.png";

  return (
    <Link href={`/markets/${market.id}`}>
      <div className="group relative glass-card border border-white/5 hover:border-indigo-500/40 transition-all duration-500 hover:-translate-y-2 overflow-hidden flex flex-col h-full">
        {/* Banner Image */}
        <div className="relative w-full h-36 overflow-hidden flex-shrink-0">
          <Image 
            src={bannerImg} 
            alt={market.title} 
            fill 
            className="object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 scale-105 group-hover:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent" />
          
          {/* Badge */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-600/40 border border-indigo-500/30 text-[10px] font-black text-indigo-100 uppercase tracking-widest shadow-2xl">
              {market.category}
            </span>
          </div>
          
          <div className="absolute top-4 right-4">
             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600/40 border border-emerald-500/30 shadow-2xl">
               <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">⚡ Gasless</span>
             </div>
          </div>
        </div>

        <div className="p-6 pt-2 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-4">
            <span className="text-3xl filter drop-shadow-lg">{market.emoji}</span>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-100 mb-6 group-hover:text-white transition-colors line-clamp-2 min-h-[3.5rem] leading-tight">
            {market.title}
          </h3>

          {/* Prediction visualization */}
          <div className="space-y-4 mb-8 mt-auto">
            <div className="flex justify-between items-end">
              <div className="text-left">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Yes</p>
                <p className="text-2xl font-black text-cyan-400 leading-none">{yesPercent}%</p>
              </div>
              
              <div className="flex-1 px-4 self-center">
                 <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-1000 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                      style={{ width: `${yesPercent}%` }}
                    />
                 </div>
              </div>

              <div className="text-right">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">No</p>
                <p className="text-2xl font-black text-rose-500 leading-none">{noPercent}%</p>
              </div>
            </div>
          </div>

          {/* Stats Footer */}
          <div className="flex justify-between pt-5 border-t border-white/5 mt-auto">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Volume</span>
              <span className="text-sm font-mono font-bold text-slate-200 mt-1">{formatCurrency(market.volume)}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Liquidity</span>
              <span className="text-sm font-mono font-bold text-slate-200 mt-1">{formatCurrency(market.liquidity)}</span>
            </div>
          </div>
        </div>

        {/* Hover Action Glow */}
        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/[0.03] transition-all duration-500 pointer-events-none" />
      </div>
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [markets, setMarkets] = useState<MarketMeta[]>([]);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const { address } = useWallet();
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [mRes, sRes] = await Promise.all([
          fetch("/api/markets"),
          fetch("/api/stats")
        ]);
        const mData = await mRes.json();
        const sData = await sRes.json();
        
        let initialMarkets: MarketMeta[] = mData.markets || [];
        
        // Get overrides from localStorage
        let savedOverrides: Record<string, any> = {};
        try {
          const stored = localStorage.getItem("market_overrides");
          if (stored) {
            savedOverrides = JSON.parse(stored);
          }
        } catch (e) {
          console.error("Error reading overrides", e);
        }

        // Apply overrides with higher priority
        const finalMarkets = initialMarkets.map(m => {
          const override = savedOverrides[m.id];
          if (override) {
            console.log("Applying home override for:", m.id);
            return {
              ...m,
              yesPrice: override.yesPrice,
              noPrice: override.noPrice,
              volume: override.volume,
              yesVolume: override.yesVolume,
              noVolume: override.noVolume,
            };
          }
          return m;
        });

        setMarkets(finalMarkets);
        setMetrics(sData.stats || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const categories = ["All", ...Array.from(new Set(markets.map((m) => m.category)))];
  const filtered = filter === "All" ? markets : markets.filter((m) => m.category === filter);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30 scroll-smooth">
      <Navbar address={address} onOpenModal={() => setShowWalletModal(true)} />
      
      {/* Spacer for fixed navbar */}
      <div className="h-16" />
      <LiveStatsHeader metrics={metrics} />

      <main className="max-w-7xl mx-auto px-6 pb-24">
        {/* Hero Section */}
        <section className="relative py-28 md:py-36 text-center overflow-hidden">
          {/* Advanced background elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none opacity-50" />
          <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 space-y-10">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl glass-light border border-white/10 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] animate-fade-in shadow-2xl">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.9)] animate-pulse" />
              Revolutionizing Prediction Markets
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.95] max-w-5xl mx-auto">
              Predict. Trade. <br />
              <span className="gradient-text-premium pb-2">Master the Future.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
              Exchange insights for rewards with <span className="text-indigo-400 font-bold">Zero Gas Fees</span>. 
              Built on Stellar, the fastest blockchain for fintech.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
              <button 
                onClick={() => document.getElementById("markets")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full sm:w-auto px-12 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xl shadow-2xl shadow-indigo-600/40 hover:scale-105 active:scale-95 hover:rotate-1 transition-all"
              >
                Trade Markets
              </button>
              <Link 
                href="/portfolio"
                className="w-full sm:w-auto px-12 py-5 rounded-2xl glass-dark border border-white/10 text-white font-black text-xl hover:bg-white/10 hover:border-indigo-500/40 transition-all shadow-xl"
              >
                My Portfolio
              </Link>
            </div>
          </div>
        </section>

        {/* Markets Header & Filter */}
        <section id="markets" className="mt-16 mb-12 pt-16 border-t border-white/5">
          <div className="flex flex-col lg:flex-row justify-between items-end gap-10 mb-16 px-2">
            <div className="space-y-2">
               <div className="flex items-center gap-3">
                  <h2 className="text-4xl font-black text-white tracking-tight">Active Markets</h2>
                  <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-widest">{filtered.length} Live</span>
               </div>
              <p className="text-slate-500 font-medium text-lg">Stake your XLM on outcomes you believe in.</p>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-900/40 p-2 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-7 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${
                    filter === cat
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-600/30"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[480px] rounded-[32px] bg-indigo-900/10 animate-pulse border border-white/5" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filtered.map((m) => (
                <MarketCard key={m.id} market={m} />
              ))}
            </div>
          )}
        </section>

        {/* Scalability Showcase */}
        <section className="mt-40 mb-20">
           <div className="glass-card p-12 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] -mr-40 -mt-40 transition-all duration-700 group-hover:bg-indigo-600/20" />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                 <div className="space-y-8">
                    <h3 className="text-4xl md:text-5xl font-black leading-tight">Scale your trading with <br/><span className="text-indigo-400">Gasless Infrastructure.</span></h3>
                    <p className="text-lg text-slate-400 leading-relaxed">We use innovative fee sponsorship to ensure that your trading experience is friction-less. No more keeping dust XLM for network fees — focus on what matters: the prediction.</p>
                    <div className="flex gap-8">
                       <div className="space-y-2">
                          <p className="text-3xl font-black text-white">0.0s</p>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Network Fees</p>
                       </div>
                       <div className="space-y-2">
                          <p className="text-3xl font-black text-white">5.2s</p>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Block Time</p>
                       </div>
                       <div className="space-y-2">
                          <p className="text-3xl font-black text-white">100%</p>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Transparent</p>
                       </div>
                    </div>
                 </div>
                 <div className="relative h-80 rounded-3xl overflow-hidden border border-white/10 shadow-3xl bg-slate-900/50 flex items-center justify-center">
                    <div className="text-center space-y-4">
                       <div className="text-6xl animate-bounce">🚀</div>
                       <p className="text-sm font-black text-indigo-300 uppercase tracking-[0.3em]">Scalable Protocol</p>
                    </div>
                 </div>
              </div>
           </div>
        </section>
      </main>

      {showWalletModal && <WalletModal onClose={() => setShowWalletModal(false)} />}
      
    </div>
  );
}
