import { confidence, impliedOpen, percentChange, type IssuerPrice } from "./core";

export const holdings = [
  { ticker: "NVDA", company: "NVIDIA", qty: 12, friday: 178.31, now: 181.72, issuer: "bStocks", spark: [42, 44, 43, 48, 51, 50, 56, 60] },
  { ticker: "TSLA", company: "Tesla", qty: 8, friday: 429.83, now: 415.62, issuer: "Ondo", spark: [60, 57, 58, 51, 48, 45, 43, 39] },
  { ticker: "AAPL", company: "Apple", qty: 20, friday: 257.13, now: 259.41, issuer: "Ondo", spark: [45, 46, 44, 47, 49, 51, 52, 54] },
  { ticker: "SPY", company: "S&P 500 ETF", qty: 6, friday: 671.38, now: 673.52, issuer: "bStocks", spark: [43, 44, 45, 44, 46, 47, 48, 49] },
  { ticker: "BRK.B", company: "Berkshire Hathaway", qty: 3, friday: 495.91, now: null, issuer: null, spark: [] },
] as const;

export const markets: Record<string, { reference: number; issuers: IssuerPrice[]; history: number[] }> = {
  NVDA: { reference: 178.31, issuers: [{ issuer: "bStocks", price: 181.78, depthUsd: 62800 }, { issuer: "Ondo", price: 181.54, depthUsd: 41300 }], history: [178.31,178.82,179.11,178.94,179.86,180.42,180.18,181.02,181.72] },
  TSLA: { reference: 429.83, issuers: [{ issuer: "bStocks", price: 416.18, depthUsd: 18400 }, { issuer: "Ondo", price: 415.62, depthUsd: 36100 }], history: [429.83,427.2,426.4,423.8,421.1,419.7,418.9,416.7,415.62] },
  AAPL: { reference: 257.13, issuers: [{ issuer: "bStocks", price: 259.36, depthUsd: 72100 }, { issuer: "Ondo", price: 259.48, depthUsd: 53400 }], history: [257.13,257.4,257.2,257.8,258.1,258.6,258.4,259.0,259.41] },
  SPY: { reference: 671.38, issuers: [{ issuer: "bStocks", price: 673.57, depthUsd: 80400 }, { issuer: "Ondo", price: 673.44, depthUsd: 67200 }], history: [671.38,671.7,671.5,672.0,672.4,672.2,672.8,673.1,673.52] },
};

export function marketSummary(ticker: keyof typeof markets) {
  const market = markets[ticker];
  const implied = impliedOpen(market.issuers);
  return { ...market, implied, gap: percentChange(implied, market.reference), confidence: confidence(market.issuers) };
}
