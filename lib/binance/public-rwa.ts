const BSTOCK_CATALOG_URL =
  "https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/stock/detail/list/ai?type=3";
const BINANCE_SPOT_API_URL = "https://api.binance.com/api/v3";

type CatalogAsset = {
  chainId: string;
  contractAddress: string;
  symbol: string;
  ticker: string;
  cs: string;
};

type CatalogResponse = {
  code: string;
  data?: CatalogAsset[];
};

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
  const catalog = await getJson<CatalogResponse>(BSTOCK_CATALOG_URL);
  if (catalog.code !== "000000" || !catalog.data) {
    throw new Error("Public Binance bStocks catalog returned an invalid response");
  }

  const asset = catalog.data.find(
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
