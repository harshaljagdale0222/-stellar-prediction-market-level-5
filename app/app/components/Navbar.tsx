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
        <Link href="/" className="flex items-center gap-2 group transition-all active:scale-95">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
            <div className="w-full h-full rounded-[10px] bg-[#020617] flex items-center justify-center overflow-hidden">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                      fill="url(#icon-grad)" stroke="url(#icon-grad)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="icon-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1"/>
                    <stop offset="1" stopColor="#22d3ee"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="flex flex-col -gap-1">
            <span className="font-black text-xl tracking-tight text-white leading-none uppercase">Stellar<span className="text-indigo-400">Predict</span></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Global Markets</span>
          </div>
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
