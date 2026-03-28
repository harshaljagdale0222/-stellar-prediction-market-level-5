"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { connectWallet, getWalletAddress, WalletType } from "@/lib/stellar";

interface WalletContextType {
  address: string | null;
  walletType: WalletType | null;
  isConnected: boolean;
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => void;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // No auto-recovery on mount
  useEffect(() => {
    setLoading(false);
  }, []);

  const connect = async (type: WalletType) => {
    setLoading(true);
    setError(null);
    try {
      const addr = await connectWallet(type);
      if (addr) {
        setAddress(addr);
        setWalletType(type);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletType(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        walletType,
        isConnected: !!address,
        connect,
        disconnect,
        loading,
        error,
        setError,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
