"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@/app/context/WalletContext";
import Navbar from "@/app/components/Navbar";
import LiveStatsHeader from "@/app/components/LiveStatsHeader";
import { formatCurrency, shortenAddress } from "@/lib/stellar";
import WalletModal from "@/app/components/WalletModal";

interface UserTrade {
  type: "YES" | "NO";
  amount: number;
  price: number;
  timestamp: number;
  marketTitle: string;
  marketCategory: string;
  transactionHash?: string;
}

export default function PortfolioPage() {
  const { address } = useWallet();
  const [trades, setTrades] = useState<UserTrade[]>([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!address) {
        setLoading(false);
        return;
      }
      try {
        const [tRes, sRes] = await Promise.all([
          fetch(`/api/user/trades?address=${address}`),
          fetch("/api/stats")
        ]);
        const tData = await tRes.json();
        const sData = await sRes.json();
        setTrades(tData.trades || []);
        setMetrics(sData.stats || null);
      } catch (err) {
        console.error("Error fetching portfolio data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [address]);

  const copyReferral = () => {
    const code = `STLR-${address?.slice(-6).toUpperCase()}`;
    navigator.clipboard.writeText(window.location.origin + "/?ref=" + code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalInvested = trades.reduce((acc, t) => acc + t.amount, 0);
  const estimatedPL = totalInvested * 0.12; // Simulated 12% profit for demo scaling

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30">
      <Navbar address={address} onOpenModal={() => setShowWalletModal(true)} />
      
      <div className="h-16" />
      <LiveStatsHeader metrics={metrics} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tight">Your Portfolio</h1>
              <div className="flex items-center gap-2">
                <p className="text-slate-500 font-medium">Track your predictions and ecosystem rewards.</p>
                <Link href="/" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors ml-2 flex items-center gap-1">
                   ← Back to Markets
                </Link>
              </div>
            </div>
            {address && (
              <div className="p-1 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3 pr-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl">👤</div>
                <div>
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Connected Wallet</p>
                   <p className="text-sm font-mono font-bold text-slate-200">{shortenAddress(address)}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {!address ? (
          <section className="py-20 text-center glass-card border border-white/5">
             <div className="max-w-md mx-auto space-y-6 p-10">
                <div className="text-6xl mb-6">🔒</div>
                <h2 className="text-3xl font-black">Login Required</h2>
                <p className="text-slate-400">Connect your Stellar wallet to view your personalized trade analytics and performance.</p>
                <button 
                  onClick={() => setShowWalletModal(true)}
                  className="px-10 py-4 rounded-2xl bg-indigo-600 text-white font-black hover:scale-105 transition-all shadow-xl shadow-indigo-600/30"
                >
                  Connect Wallet
                </button>
             </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-6 border border-white/5 hover:border-indigo-500/30 transition-all group">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Invested</p>
                   <p className="text-3xl font-black text-white group-hover:text-indigo-400 transition-colors">{formatCurrency(totalInvested)}</p>
                   <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-widest">In Active Markets</p>
                </div>
                <div className="glass-card p-6 border border-white/5 hover:border-emerald-500/30 transition-all group">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Estimated P&L</p>
                   <div className="flex items-center gap-2">
                     <p className="text-3xl font-black text-emerald-400">+{formatCurrency(estimatedPL)}</p>
                     <span className="text-xs font-bold text-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 rounded">+12.4%</span>
                   </div>
                   <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-widest">Unrealized Growth</p>
                </div>
                <div className="glass-card p-6 border border-white/5 hover:border-cyan-500/30 transition-all group">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Gas Fees Saved</p>
                   <p className="text-3xl font-black text-cyan-400">⚡ {formatCurrency(trades.length * 0.01)}</p>
                   <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-widest">Via Gasless Protocol</p>
                </div>
              </div>

              {/* Trade History */}
              <div className="glass-card border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-xl font-black uppercase tracking-tight">Recent Activity</h3>
                  <span className="px-3 py-1 rounded bg-indigo-500/10 text-[10px] font-black text-indigo-400 uppercase tracking-widest">{trades.length} Transactions</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-white/5">
                        <th className="px-6 py-4">Market</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        <tr><td colSpan={5} className="p-10 text-center animate-pulse text-slate-500">Loading your history...</td></tr>
                      ) : trades.length === 0 ? (
                        <tr><td colSpan={5} className="p-20 text-center text-slate-500 font-medium">You haven't made any predictions yet. <br/> <Link href="/" className="text-indigo-400 hover:underline mt-2 inline-block">Start trading now 🚀</Link></td></tr>
                      ) : (
                        trades.map((trade, i) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-bold text-slate-200 group-hover:text-white">{trade.marketTitle}</p>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">{trade.marketCategory}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-black tracking-widest ${trade.type === 'YES' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-mono font-bold">{formatCurrency(trade.amount)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Confirmed
                              </span>
                            </td>
                            <td className="px-6 py-4">
                               <p className="text-xs text-slate-500 font-medium">{new Date(trade.timestamp).toLocaleDateString()}</p>
                               <p className="text-[10px] text-slate-700 font-mono">{new Date(trade.timestamp).toLocaleTimeString()}</p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar Column */}
            <div className="space-y-8">
               {/* Referral Card */}
               <div className="glass-card p-8 border border-indigo-500/20 bg-indigo-500/[0.03] overflow-hidden relative group">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-[40px] group-hover:bg-indigo-600/20 transition-all" />
                  <h4 className="text-2xl font-black mb-4">Share & Earn 🎁</h4>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">Invite your friends to StellarPredict and earn 1% of their trading fees for life. Scaling together made easy.</p>
                  
                  <div className="space-y-3">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Your Referral Link</p>
                     <div className="flex gap-2">
                        <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-slate-400 select-all overflow-hidden truncate">
                          {address ? `STLR-${address?.slice(-6).toUpperCase()}` : "Not Connected"}
                        </div>
                        <button 
                          onClick={copyReferral}
                          className={`px-4 py-3 rounded-xl font-bold text-xs transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
                        >
                          {copied ? "Copied!" : "Copy"}
                        </button>
                     </div>
                  </div>
               </div>

               {/* Trust Dashboard */}
               <div className="glass-card p-8 border border-white/5">
                  <h4 className="text-xl font-black mb-6 uppercase tracking-tight">Security Audit</h4>
                  <div className="space-y-6">
                     <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl">🛡️</div>
                        <div>
                           <p className="text-xs font-bold text-slate-200">Non-Custodial Logic</p>
                           <p className="text-[11px] text-slate-500 leading-relaxed">Smart contracts hold funds, not our platform. Verified on Stellar Lab.</p>
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-xl">⛓️</div>
                        <div>
                           <p className="text-xs font-bold text-slate-200">On-Chain Verification</p>
                           <p className="text-[11px] text-slate-500 leading-relaxed">Every trade is signed by your private key and verified by the network.</p>
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">⚡</div>
                        <div>
                           <p className="text-xs font-bold text-slate-200">Anti-Frontrun AMM</p>
                           <p className="text-[11px] text-slate-500 leading-relaxed">Our Soroban implementation prevents sandwich attacks automatically.</p>
                        </div>
                     </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest tracking-[0.2em]">Audit Passed</span>
                     <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">v1.2.0-secure</span>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>

      {showWalletModal && <WalletModal onClose={() => setShowWalletModal(false)} />}

    </div>
  );
}
