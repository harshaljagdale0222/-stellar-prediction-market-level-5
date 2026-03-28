import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "markets.json");

export interface MarketMeta {
  id: string;
  contractAddress: string;
  title: string;
  description: string;
  category: string;
  emoji: string;
  endDate: string;
  yesPrice: number;
  noPrice: number;
  yesVolume: number;
  noVolume: number;
  volume: number;
  liquidity: number;
  resolved: boolean;
  outcome?: "YES" | "NO" | "INVALID";
  createdAt: string;
}

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const seed: MarketMeta[] = [
      {
        id: "1",
        contractAddress: "CB5ZKRVTZCSERHLYMLXZ6EWSVJ3DY7J6JVRMUKPNYDS2VGODLCLE4V37",
        title: "Bitcoin surpasses $150,000 before July 2026?",
        description: "Will Bitcoin's price exceed $150,000 USD on any major exchange before July 1st, 2026?",
        category: "Crypto",
        emoji: "₿",
        endDate: "2026-07-01",
        yesPrice: 0.62,
        noPrice: 0.38,
        yesVolume: 79600,
        noVolume: 48800,
        volume: 128400,
        liquidity: 45200,
        resolved: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "2",
        contractAddress: "CDCZYILWPDOZMFE3YK2SY6ES6NBN53GXVOFTDH2GSOQ7DKLQ5FNJCN3L",
        title: "Ethereum ETF approved by SEC in 2026?",
        description: "Will the U.S. Securities and Exchange Commission approve a spot Ethereum ETF in 2026?",
        category: "Crypto",
        emoji: "Ξ",
        endDate: "2026-12-31",
        yesPrice: 0.74,
        noPrice: 0.26,
        yesVolume: 66082,
        noVolume: 23218,
        volume: 89300,
        liquidity: 31000,
        resolved: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "3",
        contractAddress: "CB5ZKRVTZCSERHLYMLXZ6EWSVJ3DY7J6JVRMUKPNYDS2VGODLCLE4V37",
        title: "India wins 2026 FIFA World Cup?",
        description: "Will the Indian national football team win the 2026 FIFA World Cup?",
        category: "Sports",
        emoji: "⚽",
        endDate: "2026-07-19",
        yesPrice: 0.04,
        noPrice: 0.96,
        yesVolume: 8600,
        noVolume: 206400,
        volume: 215000,
        liquidity: 88000,
        resolved: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "4",
        contractAddress: "CDCZYILWPDOZMFE3YK2SY6ES6NBN53GXVOFTDH2GSOQ7DKLQ5FNJCN3L",
        title: "Global temperature record broken in 2026?",
        description: "Will 2026 set a new global average surface temperature record, surpassing 2024?",
        category: "Climate",
        emoji: "🌡️",
        endDate: "2026-12-31",
        yesPrice: 0.58,
        noPrice: 0.42,
        yesVolume: 25636,
        noVolume: 18564,
        volume: 44200,
        liquidity: 18500,
        resolved: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "5",
        contractAddress: "CB5ZKRVTZCSERHLYMLXZ6EWSVJ3DY7J6JVRMUKPNYDS2VGODLCLE4V37",
        title: "Stellar XLM reaches $1 before 2027?",
        description: "Will the price of Stellar Lumens (XLM) surpass $1.00 USD before January 1st, 2027?",
        category: "Crypto",
        emoji: "⭐",
        endDate: "2026-12-31",
        yesPrice: 0.31,
        noPrice: 0.69,
        yesVolume: 21018,
        noVolume: 46782,
        volume: 67800,
        liquidity: 22000,
        resolved: false,
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
  }
}

export function getAllMarkets(): MarketMeta[] {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

export function getMarketById(id: string): MarketMeta | null {
  const markets = getAllMarkets();
  return markets.find((m) => m.id === id) ?? null;
}

export function createMarket(data: Omit<MarketMeta, "id" | "createdAt">): MarketMeta {
  const markets = getAllMarkets();
  const newMarket: MarketMeta = {
    ...data,
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
  };
  markets.push(newMarket);
  fs.writeFileSync(DB_PATH, JSON.stringify(markets, null, 2));
  return newMarket;
}

export function updateMarket(id: string, patch: Partial<MarketMeta>): MarketMeta | null {
  const markets = getAllMarkets();
  const idx = markets.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  markets[idx] = { ...markets[idx], ...patch };
  fs.writeFileSync(DB_PATH, JSON.stringify(markets, null, 2));
  return markets[idx];
}
