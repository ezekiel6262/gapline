// Binance's market-data-only host is intended for public endpoints and is
// available from server regions where the main exchange host returns HTTP 451.
const BINANCE_SPOT_API_URL = "https://data-api.binance.vision/api/v3";

type CatalogAsset = {
  chainId: string;
  contractAddress: string;
  symbol: string;
  ticker: string;
  cs: string;
};

// Verified against Binance's public bStocks RWA catalog. Keeping the small UI
// allowlist local avoids treating a geo-restricted product endpoint as a
// runtime dependency; prices still come from Binance's live public market API.
const BSTOCKS: CatalogAsset[] = [
  { chainId: "56", contractAddress: "0x02fca66c1d1afb4e2a7884261eb00f63598a7436", symbol: "NVDAB", ticker: "NVDA", cs: "NVDABUSDT" },
  { chainId: "56", contractAddress: "0x5b1910eaad6450e50f816082aa078c41f10c292f", symbol: "TSLAB", ticker: "TSLA", cs: "TSLABUSDT" },
  { chainId: "56", contractAddress: "0x431a3bee82e2ca41e49895cbece5bb0f76a89b7a", symbol: "AAPLB", ticker: "AAPL", cs: "AAPLBUSDT" },
  { chainId: "56", contractAddress: "0x7138b48df7d98d7e3cc221bfe7192d0a178182d8", symbol: "SPYB", ticker: "SPY", cs: "SPYBUSDT" },
];

type TickerResponse = {
  lastPrice: string;
  closeTime: number;
};

type Kline = [number, string, string, string, string, string, number, ...unknown[]];

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Public Binance request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getPublicBstockMarket(ticker: string) {
  const asset = BSTOCKS.find(
    (item) => item.chainId === "56" && item.ticker.toUpperCase() === ticker.toUpperCase() && item.cs,
  );
  if (!asset) return null;

  const [market, klines] = await Promise.all([
    getJson<TickerResponse>(
      `${BINANCE_SPOT_API_URL}/ticker/24hr?symbol=${encodeURIComponent(asset.cs)}`,
    ),
    getJson<Kline[]>(
      `${BINANCE_SPOT_API_URL}/klines?symbol=${encodeURIComponent(asset.cs)}&interval=1d&limit=10`,
    ),
  ]);
  const price = Number(market.lastPrice);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Public Binance market returned an invalid price");
  }

  const completedKlines = klines.filter((kline) => kline[6] <= market.closeTime);
  const friday = [...completedKlines].reverse().find((kline) => new Date(kline[6]).getUTCDay() === 5);
  const referencePrice = Number(friday?.[4]);
  if (!friday || !Number.isFinite(referencePrice) || referencePrice <= 0) {
    throw new Error("Public Binance market returned no recent Friday close");
  }

  return {
    issuer: "bStocks" as const,
    symbol: asset.symbol,
    pair: asset.cs,
    contractAddress: asset.contractAddress,
    chainId: asset.chainId,
    price,
    updatedAt: new Date(market.closeTime).toISOString(),
    referencePrice,
    referenceUpdatedAt: new Date(friday[6]).toISOString(),
    history: [...completedKlines.slice(-8).map((kline) => Number(kline[4])), price],
  };
}
