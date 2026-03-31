"use client";

import Link from "next/link";
import { shortenAddress } from "@/lib/stellar";

interface NavbarProps {
  address: string | null;
  onOpenModal: () => void;
}

export default function Navbar({ address, onOpenModal }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] glass-dark border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/20 text-white">
            ⭐
          </div>
          <span className="font-bold text-xl tracking-tighter gradient-text-premium">StellarPredict</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <Link href="/" className="underline-offset-4 hover:text-white transition-all hover:scale-105">Markets</Link>
          <Link href="/portfolio" className="underline-offset-4 hover:text-white transition-all hover:scale-105">Portfolio</Link>
          <Link href="/create" className="px-4 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 transition-all">
            + Create Market
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Testnet Live</span>
          </div>
          
          {address ? (
            <button className="glass-light px-4 py-1.5 rounded-full text-sm text-indigo-200 font-mono border border-indigo-500/30 hover:border-indigo-400 transition-all">
              {shortenAddress(address)}
            </button>
          ) : (
            <button
              onClick={onOpenModal}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
