import type { Metadata } from "next";
import { WalletProvider } from "./context/WalletContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "StellarPredict — Decentralized Prediction Markets",
  description:
    "Trade on real-world events using Stellar Soroban smart contracts. Earn rewards by predicting outcomes with on-chain AMM mechanics.",
  keywords: "prediction market, stellar, soroban, amm, crypto, defi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
