"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MarketMeta } from "@/lib/db";
import confetti from "canvas-confetti";
import {
  formatCurrency,
  calcBuyYes,
  calcSellYes,
  calcBuyNo,
  shortenAddress,
  submitTrade,
  WalletType,
} from "@/lib/stellar";
import WalletModal from "@/app/components/WalletModal";
import { useWallet } from "@/app/context/WalletContext";

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "warn" | "success";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <div
        className={`glass rounded-2xl px-4 py-3 flex items-start gap-3 max-w-sm shadow-xl border ${
          type === "warn" ? "border-amber-500/30" : "border-green-500/30"
        }`}
      >
        <span className="text-xl mt-0.5">{type === "warn" ? "🦺" : "✅"}</span>
        <div className="flex-1">
          <p
            className={`text-sm font-semibold ${
              type === "warn" ? "text-amber-300" : "text-green-300"
            }`}
          >
            {type === "warn" ? "Warning" : "Success"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-lg leading-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

import Navbar from "@/app/components/Navbar";

// ── Trading Panel ──────────────────────────────────────────────────────────────
function TradingPanel({
  market,
  walletAddress,
  walletType,
  onToast,
  onOpenWallet,
  onTradeSuccess,
}: {
  market: MarketMeta;
  walletAddress: string | null;
  walletType: WalletType | null;
  onToast: (msg: string, type: "warn" | "success") => void;
  onOpenWallet: () => void;
  onTradeSuccess: (update: Partial<MarketMeta>) => void;
}) {
  const [tab, setTab] = useState<
    "buy_yes" | "buy_no" | "sell_yes" | "add_liquidity"
  >("buy_yes");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txInfo, setTxInfo] = useState<{ hash: string; msg: string } | null>(null);

  const totalPool = market.liquidity;
  const reserveYes = totalPool * (1 - market.yesPrice);
  const reserveNo = totalPool * market.yesPrice;
  const parsedAmount = parseFloat(amount) || 0;

  let preview = { label: "", value: "", impact: "", newYesPrice: market.yesPrice };
  if (tab === "buy_yes" && parsedAmount > 0) {
    const r = calcBuyYes(reserveYes, reserveNo, parsedAmount);
    preview = {
      label: "YES tokens out",
      value: r.yesOut.toFixed(2),
      impact: `${r.priceImpact.toFixed(2)}% price impact`,
      newYesPrice: r.newYesPrice,
    };
  } else if (tab === "buy_no" && parsedAmount > 0) {
    const r = calcBuyNo(reserveYes, reserveNo, parsedAmount);
    preview = {
      label: "NO tokens out",
      value: r.noOut.toFixed(2),
      impact: `${r.priceImpact.toFixed(2)}% price impact`,
      newYesPrice: r.newYesPrice,
    };
  } else if (tab === "sell_yes" && parsedAmount > 0) {
    const r = calcSellYes(reserveYes, reserveNo, parsedAmount);
    preview = {
      label: "YES tokens needed",
      value: isFinite(r.yesIn) ? r.yesIn.toFixed(2) : "∞",
      impact: `${r.priceImpact.toFixed(2)}% price impact`,
      newYesPrice: r.newYesPrice,
    };
  } else if (tab === "add_liquidity") {
    preview = {
      label: "LP tokens estimate",
      value: parsedAmount.toFixed(2),
      impact: "Proportional share",
      newYesPrice: market.yesPrice,
    };
  }

  const handleSubmit = async () => {
    if (!walletAddress) {
      onOpenWallet();
      return;
    }
    if (!parsedAmount) {
      onToast("Please enter an amount.", "warn");
      return;
    }
    setLoading(true);
    try {
      const actionRef = tab as "buy_yes" | "buy_no" | "sell_yes" | "add_liquidity";
      const { txHash, message } = await submitTrade({
        marketId: market.id,
        contractAddress: market.contractAddress,
        action: actionRef,
        amount: parsedAmount,
        walletAddress: walletAddress!,
        walletType: walletType!,
      });
      setTxInfo({ hash: txHash, msg: message });
      
      // Fire confetti celebration!
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#8b5cf6", "#0ea5e9", "#ec4899", "#facc15"],
      });

      onToast(message, "success");

      // Visually update the market mechanics as per user request
      const newPrice = preview.newYesPrice ?? market.yesPrice;
      const patchData: Partial<MarketMeta> = {
        yesPrice: newPrice,
        noPrice: 1 - newPrice,
        volume: market.volume + parsedAmount,
        yesVolume: market.yesVolume + (actionRef === "buy_yes" ? parsedAmount : 0),
        noVolume: market.noVolume + (actionRef === "buy_no" ? parsedAmount : 0),
        liquidity: market.liquidity + (actionRef === "add_liquidity" ? parsedAmount : 0),
      };

      // Background patch API
      fetch(`/api/markets/${market.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      }).catch(console.error);

      // Instantly update UI prop
      onTradeSuccess(patchData);

      // Session Persistence for Market Stats (Vercel Fix)
      try {
        const overrides = JSON.parse(localStorage.getItem("market_overrides") || "{}");
        overrides[market.id] = { ...patchData };
        localStorage.setItem("market_overrides", JSON.stringify(overrides));
      } catch (e) {
        console.error("Local storage error (Market):", e);
      }

      // Session Persistence for Portfolio (Vercel Fix)
      const sessionTrade = {
        type: actionRef.includes("yes") ? "YES" : "NO",
        amount: parsedAmount,
        price: actionRef.includes("yes") ? market.yesPrice : market.noPrice,
        timestamp: Date.now(),
        marketTitle: market.title,
        marketCategory: market.category,
        transactionHash: txHash
      };
      const existing = JSON.parse(localStorage.getItem("user_trades") || "[]");
      localStorage.setItem("user_trades", JSON.stringify([sessionTrade, ...existing]));

    } catch (e: any) {
      onToast(e.message || "Transaction failed or was rejected.", "warn");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "buy_yes", label: "Buy YES", color: "text-cyan-400" },
    { id: "buy_no", label: "Buy NO", color: "text-pink-400" },
    { id: "sell_yes", label: "Sell YES", color: "text-slate-300" },
    { id: "add_liquidity", label: "LP", color: "text-violet-400" },
  ] as const;

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-slate-400 mb-4">TRADE</h2>

      <div className="flex gap-1 glass rounded-xl p-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setTxInfo(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id
                ? `bg-white/10 text-white ${t.color}`
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="text-xs text-slate-500 mb-1.5 block">
          {tab === "sell_yes" ? "Collateral out (USDC)" : "Amount (USDC)"}
        </label>
        <div className="flex items-center glass rounded-xl border border-white/10 focus-within:border-violet-500/50 transition-colors">
          <input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setTxInfo(null);
            }}
            placeholder="0.00"
            className="flex-1 bg-transparent text-white px-4 py-3 outline-none text-sm font-mono"
          />
          <span className="text-slate-500 text-xs pr-4">USDC</span>
        </div>
        <div className="flex justify-end mt-1 gap-2">
          {["25", "50", "100"].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(v)}
              className="text-xs text-violet-400 hover:text-violet-300 px-2 py-0.5 glass rounded"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {preview.label && parsedAmount > 0 && (
        <div className="glass rounded-xl p-3 mb-4 border border-white/5">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">{preview.label}</span>
            <span className="text-white font-mono font-semibold">
              {preview.value}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Price Impact</span>
            <span className="text-amber-400">{preview.impact}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-slate-500">Fee (1%)</span>
            <span className="text-slate-400">
              {(parsedAmount * 0.01).toFixed(2)} USDC
            </span>
          </div>
        </div>
      )}

      {!walletAddress && (
        <div className="glass rounded-xl p-3 mb-3 border border-violet-500/20 text-center">
          <p className="text-xs text-slate-400 mb-2">
            Connect your wallet to trade
          </p>
          <button
            onClick={onOpenWallet}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-xs font-semibold"
          >
            Connect Wallet
          </button>
        </div>
      )}

      {txInfo ? (
        <div className="glass rounded-xl p-3 border border-green-500/20">
          <p className="text-green-400 text-xs font-semibold mb-1">
            ✅ {txInfo.msg}
          </p>
          <p className="text-slate-500 text-xs font-mono break-all">
            {txInfo.hash.slice(0, 32)}…
          </p>
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={loading || !parsedAmount}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
            tab === "buy_yes"
              ? "bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 glow-yes"
              : tab === "buy_no"
              ? "bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 glow-no"
              : tab === "add_liquidity"
              ? "bg-gradient-to-r from-violet-600 to-violet-500 glow-purple"
              : "bg-white/10 hover:bg-white/15"
          } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Submitting…
            </span>
          ) : tab === "buy_yes" ? (
            "Buy YES Tokens"
          ) : tab === "buy_no" ? (
            "Buy NO Tokens"
          ) : tab === "sell_yes" ? (
            "Sell YES Tokens"
          ) : (
            "Add Liquidity"
          )}
        </button>
      )}
    </div>
  );
}

// ── Probability Gauge ──────────────────────────────────────────────────────────
function ProbabilityGauge({ yesPrice }: { yesPrice: number }) {
  const yes = Math.round(yesPrice * 100);
  const no = 100 - yes;
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-slate-400 mb-4">
        CURRENT ODDS
      </h2>
      <div className="flex gap-4 mb-4">
        <div className="flex-1 glass rounded-xl p-4 border border-cyan-500/20 glow-yes text-center">
          <div className="text-3xl font-extrabold text-cyan-400">{yes}%</div>
          <div className="text-xs text-slate-500 mt-1">YES probability</div>
          <div className="text-xs text-cyan-400 font-mono mt-1">
            ${yesPrice.toFixed(3)}
          </div>
        </div>
        <div className="flex-1 glass rounded-xl p-4 border border-pink-500/20 glow-no text-center">
          <div className="text-3xl font-extrabold text-pink-400">{no}%</div>
          <div className="text-xs text-slate-500 mt-1">NO probability</div>
          <div className="text-xs text-pink-400 font-mono mt-1">
            ${(1 - yesPrice).toFixed(3)}
          </div>
        </div>
      </div>
      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-700"
          style={{ width: `${yes}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
        <span>NO ←</span>
        <span>→ YES</span>
      </div>
    </div>
  );
}

// ── Main Market Page ───────────────────────────────────────────────────────────
export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [market, setMarket] = useState<MarketMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const { address: walletAddress, walletType } = useWallet();
  const [toast, setToast] = useState<{
    msg: string;
    type: "warn" | "success";
  } | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = useCallback(
    (msg: string, type: "warn" | "success") => setToast({ msg, type }),
    []
  );
  const handleWalletConnect = useCallback((address: string) => {
    // Session managed via context
    setShowWalletModal(false);
  }, []);

  useEffect(() => {
    const loadMarket = async () => {
      try {
        const response = await fetch(`/api/markets/${id}`);
        const data = await response.json();
        
        if (data?.market) {
          // Check for manual overrides FIRST
          const storedOverrides = localStorage.getItem("market_overrides");
          if (storedOverrides) {
            const parsed = JSON.parse(storedOverrides);
            if (parsed[id]) {
              console.log("Applying local override for market:", id);
              setMarket({ ...data.market, ...parsed[id] });
              setLoading(false);
              return;
            }
          }
          setMarket(data.market);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadMarket();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen grid-bg">
        <Navbar address={walletAddress} onOpenModal={() => setShowWalletModal(true)} />
        <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
          {/* Skeleton Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-4 w-16 bg-white/5 rounded-full animate-pulse" />
            <span className="text-slate-600">/</span>
            <div className="h-4 w-52 bg-white/5 rounded-full animate-pulse" />
          </div>

          {/* Skeleton Header Card */}
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 animate-pulse shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-20 bg-white/5 rounded-full animate-pulse" />
                <div className="h-7 w-3/4 bg-white/5 rounded-lg animate-pulse" />
                <div className="h-4 w-1/2 bg-white/5 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 bg-white/5 rounded-full animate-pulse" />
                  <div className="h-6 w-24 bg-white/5 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Skeleton Two-Column */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass rounded-2xl h-44 animate-pulse" />
              <div className="glass rounded-2xl h-72 animate-pulse" />
            </div>
            <div className="glass rounded-2xl h-64 animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen grid-bg flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">Market not found.</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 glass rounded-xl text-sm text-violet-300"
        >
          ← Back to markets
        </button>
      </div>
    );
  }

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(market.endDate).getTime() - Date.now()) / 86400000
    )
  );

  return (
    <div className="min-h-screen grid-bg">
      <Navbar
        address={walletAddress}
        onOpenModal={() => setShowWalletModal(true)}
      />

      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={dismissToast}
        />
      )}

      {showWalletModal && (
        <WalletModal
          onClose={() => setShowWalletModal(false)}
        />
      )}

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-violet-400 transition-colors">
            Markets
          </Link>
          <span>/</span>
          <span className="text-slate-300 truncate max-w-xs">
            {market.title}
          </span>
        </div>

        {/* Header */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-white/10 flex items-center justify-center text-3xl shrink-0">
              {market.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300">
                  {market.category}
                </span>
                {market.resolved ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-300">
                    Resolved: {market.outcome}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    {daysLeft} days remaining
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
                {market.title}
              </h1>
              <p className="text-sm text-slate-400">{market.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/5">
            <div>
              <div className="text-xs text-slate-500 mb-1">Volume</div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(market.volume)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Liquidity</div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(market.liquidity)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Contract</div>
              <div
                className="text-xs font-mono text-violet-300 truncate"
                title={market.contractAddress}
              >
                {market.contractAddress.slice(0, 12)}…
              </div>
            </div>
          </div>
        </div>

        {/* Two Column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ProbabilityGauge yesPrice={market.yesPrice} />

            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-slate-400 mb-4">
                AMM MECHANICS
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="glass rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">
                    YES Reserve
                  </div>
                  <div className="font-mono text-cyan-400">
                    {(market.liquidity * (1 - market.yesPrice)).toFixed(0)} USDC
                  </div>
                </div>
                <div className="glass rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">NO Reserve</div>
                  <div className="font-mono text-pink-400">
                    {(market.liquidity * market.yesPrice).toFixed(0)} USDC
                  </div>
                </div>
                <div className="glass rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">
                    k (invariant)
                  </div>
                  <div className="font-mono text-violet-400 text-xs">
                    {(
                      market.liquidity *
                      (1 - market.yesPrice) *
                      market.liquidity *
                      market.yesPrice
                    ).toFixed(0)}
                  </div>
                </div>
                <div className="glass rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">Fee Rate</div>
                  <div className="font-mono text-amber-400">1%</div>
                </div>
              </div>

              {/* Sentiment Tracker Section */}
              <div className="mt-8 p-5 glass rounded-2xl border border-white/5">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">Sentiment Support</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Total USDC Placed</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-300">
                      {formatCurrency(market.yesVolume + market.noVolume)} Total
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        YES Support
                      </span>
                      <span className="text-white font-mono font-bold">{formatCurrency(market.yesVolume)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000"
                        style={{ width: `${(market.yesVolume / (market.yesVolume + market.noVolume || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-pink-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                        NO Support
                      </span>
                      <span className="text-white font-mono font-bold">{formatCurrency(market.noVolume)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-600 to-pink-400 transition-all duration-1000"
                        style={{ width: `${(market.noVolume / (market.yesVolume + market.noVolume || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            {market.resolved ? (
              <div className="glass rounded-2xl p-6 text-center border border-green-500/20">
                <div className="text-4xl mb-3">🏆</div>
                <h2 className="text-lg font-bold text-white mb-1">
                  Market Resolved
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  Outcome:{" "}
                  <span className="text-green-400 font-bold">
                    {market.outcome}
                  </span>
                </p>
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Claim Winnings
                </button>
              </div>
            ) : (
              <TradingPanel
                market={market}
                walletAddress={walletAddress}
                walletType={walletType}
                onToast={showToast}
                onOpenWallet={() => setShowWalletModal(true)}
                onTradeSuccess={(update) => {
                  setMarket((m) => {
                    if (!m) return m;
                    const next = { ...m, ...update };
                    
                    // Persistence logic for Vercel
                    const overrides = JSON.parse(localStorage.getItem("market_overrides") || "{}");
                    overrides[m.id] = {
                      yesPrice: next.yesPrice,
                      noPrice: next.noPrice,
                      volume: next.volume,
                      yesVolume: next.yesVolume,
                      noVolume: next.noVolume
                    };
                    localStorage.setItem("market_overrides", JSON.stringify(overrides));
                    
                    return next;
                  });
                }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
