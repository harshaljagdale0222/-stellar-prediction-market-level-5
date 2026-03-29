"use client";

import { useState, useEffect } from "react";
import { shortenAddress } from "@/lib/stellar";
import { getNetworkDetails } from "@stellar/freighter-api";
import { useWallet } from "@/app/context/WalletContext";

interface WalletModalProps {
  onClose: () => void;
  // onConnect and currentAddress are now managed via useWallet hook inside the component
}

function WalletModal({ onClose }: WalletModalProps) {
  const { address: currentAddress, connect, disconnect, loading, error, setError } = useWallet();
  const [network, setNetwork] = useState<string | null>(null);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const options = [
    {
      id: "freighter" as const,
      name: "Freighter Wallet",
      description: "Official & most secure (Extension)",
      icon: "🪐",
      color: "from-violet-600 to-indigo-700",
    },
    {
      id: "albedo" as const,
      name: "Albedo",
      description: "No extension - works on Mobile",
      icon: "🌤️",
      color: "from-cyan-500 to-blue-600",
    },
    {
      id: "xbull" as const,
      name: "xBULL Wallet",
      description: "Advanced controls (Extension)",
      icon: "🐂",
      color: "from-orange-500 to-red-600",
    },
  ];

  const handleConnect = async (type: "freighter" | "albedo" | "xbull") => {
    try {
      setConnectingWallet(type);
      await connect(type);
      onClose();
    } catch (e) {
      // Error is handled by context
    } finally {
      setConnectingWallet(null);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative glass rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl shadow-violet-500/10 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-sm">
              ⭐
            </div>
            <span className="font-bold gradient-text">StellarPredict</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 glass rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {currentAddress ? (
          /* Already Connected State */
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600/30 to-cyan-600/30 border border-violet-500/30 flex items-center justify-center text-3xl mb-3">
                🪐
              </div>
              <p className="text-xs text-slate-500 mb-1">Connected Wallet</p>
              <p className="text-lg font-bold text-white font-mono">{shortenAddress(currentAddress)}</p>
              {network && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {network}
                </div>
              )}
            </div>

            {/* Full address */}
            <div className="glass rounded-xl p-3 mb-4 border border-white/5">
              <p className="text-xs text-slate-500 mb-1">Full Address</p>
              <p className="text-xs font-mono text-slate-300 break-all">{currentAddress}</p>
            </div>

            {/* Copy button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(currentAddress);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
              }}
              className="w-full py-2.5 glass rounded-xl text-sm border border-white/10 hover:border-violet-400/30 transition-all mb-3 flex items-center justify-center gap-2"
            >
              {copySuccess ? (
                <span className="text-green-400 font-semibold">✅ Copied!</span>
              ) : (
                <span className="text-slate-300 hover:text-white">📋 Copy Address</span>
              )}
            </button>

            {/* Disconnect */}
            <button
              onClick={handleDisconnect}
              className="w-full py-2.5 rounded-xl text-sm text-pink-400 hover:text-pink-300 border border-pink-500/20 hover:border-pink-500/40 transition-all glass"
            >
              Disconnect Wallet
            </button>
          </>
        ) : (
          /* Connect State */
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-white/10 flex items-center justify-center text-3xl mb-3 animate-pulse">
                🔗
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Connect Wallet</h2>
              <p className="text-sm text-slate-400">
                Choose your preferred Stellar wallet to start trading.
              </p>
            </div>

            {/* Wallet Options */}
            <div className="space-y-3">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleConnect(opt.id)}
                  disabled={loading}
                  className={`w-full flex items-center gap-4 glass rounded-2xl p-4 border transition-all group disabled:cursor-not-allowed text-left ${
                    connectingWallet === opt.id
                      ? "border-violet-500/50 bg-violet-500/5"
                      : "border-white/5 hover:border-violet-500/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center text-xl shrink-0 shadow-lg`}>
                    {connectingWallet === opt.id ? (
                      <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin block" />
                    ) : opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
                      {opt.name}
                    </p>
                    <p className="text-xs truncate">
                      {connectingWallet === opt.id
                        ? <span className="text-violet-400 animate-pulse">Connecting...</span>
                        : <span className="text-slate-500">{opt.description}</span>
                      }
                    </p>
                  </div>
                  <span className={`transition-colors ${
                    connectingWallet === opt.id ? "text-violet-400" : "text-slate-500 group-hover:text-violet-400"
                  }`}>→</span>
                </button>
              ))}
            </div>

            {loading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-violet-400">
                <div className="w-3 h-3 rounded-full border border-violet-500/30 border-t-violet-500 animate-spin" />
                Connecting to wallet...
              </div>
            )}

            {error && (
              <div className="glass rounded-xl p-3 border border-red-500/20 mb-3">
                <p className="text-xs text-red-400 font-medium">{error}</p>
                {error.includes("not found") && (
                  <p className="text-[10px] text-slate-500 mt-2">
                    Try refreshing the page or checking if the extension is enabled.
                  </p>
                )}
                {(error.includes("install") || error.includes("not found")) && (
                  <a
                    href="https://www.freighter.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-violet-400 hover:text-violet-300 underline mt-2 inline-block"
                  >
                    Get Freighter →
                  </a>
                )}
              </div>
            )}

            <p className="text-center text-xs text-slate-600 mt-2">
              By connecting, you agree to the Terms of Use
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default WalletModal;
