"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/app/context/WalletContext";
import WalletModal from "@/app/components/WalletModal";

const CATEGORIES = ["Crypto", "Sports", "Politics", "Climate", "Other"];

export default function CreateMarketPage() {
  const router = useRouter();
  const { address, connect, disconnect } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [form, setForm] = useState({
    contractAddress: "",
    title: "",
    description: "",
    category: "Crypto",
    emoji: "🔮",
    endDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create market");
      }
      const { market } = await res.json();
      router.push(`/markets/${market.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const EMOJIS = ["🔮", "₿", "Ξ", "⭐", "⚽", "🌡️", "🗳️", "🚀", "💎", "🌊"];

  return (
    <div className="min-h-screen grid-bg">
      {/* Navbar with global wallet */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-sm font-bold">⭐</div>
              <span className="font-bold text-lg tracking-tight gradient-text">StellarPredict</span>
            </Link>
            <Link href="/" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors">← Dashboard</Link>
          </div>
          
          <div className="flex items-center gap-3">
            {address ? (
               <div className="glass px-3 py-1.5 rounded-full text-xs text-violet-300 font-mono border border-violet-500/30">
                 {address.slice(0, 5)}...{address.slice(-4)}
               </div>
            ) : (
               <button 
                 onClick={() => setShowWalletModal(true)}
                 className="px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-xs font-semibold"
               >
                 Connect Wallet
               </button>
            )}
          </div>
        </div>
      </nav>

      {showWalletModal && (
        <WalletModal onClose={() => setShowWalletModal(false)} />
      )}

      <main className="max-w-2xl mx-auto px-6 pt-28 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-white/10 flex items-center justify-center text-3xl mb-4">
            🏗️
          </div>
          <h1 className="text-3xl font-extrabold gradient-text mb-2">Create a Market</h1>
          <p className="text-slate-400 text-sm">Register your Soroban prediction market contract with off-chain metadata.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Contract Address */}
          <div className="glass rounded-2xl p-5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
              Soroban Contract Address
            </label>
            <input
              required
              value={form.contractAddress}
              onChange={(e) => setForm((f) => ({ ...f, contractAddress: e.target.value }))}
              placeholder="C..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-600 outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          {/* Title + Emoji + Category */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Market Details
            </label>

            <div className="flex gap-3">
              {/* Emoji picker */}
              <div>
                <div className="text-xs text-slate-500 mb-1.5">Icon</div>
                <div className="flex flex-wrap gap-1.5 w-32">
                  {EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, emoji: em }))}
                      className={`w-8 h-8 rounded-lg text-lg transition-all flex items-center justify-center ${
                        form.emoji === em ? "bg-violet-600 scale-110" : "glass hover:bg-white/10"
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1.5">Title</div>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Will Bitcoin hit $200k?"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1.5">Category</div>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 transition-colors"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1.5">Description</div>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the resolution criteria clearly..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/50 transition-colors resize-none"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="glass rounded-2xl p-5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
              Resolution Date
            </label>
            <input
              type="date"
              required
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              min={new Date().toISOString().split("T")[0]}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50 transition-colors [color-scheme:dark]"
            />
          </div>

          {error && (
            <div className="glass rounded-xl p-3 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Creating Market…
              </span>
            ) : (
              "Create Prediction Market →"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
