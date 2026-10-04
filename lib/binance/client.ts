import { createHmac } from "node:crypto";

const BASE_URL = "https://web3.binance.com/build";

export type BinanceEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
  success: boolean;
};

export type RwaSearchResult = {
  ticker: string;
  companyName: string;
  assets: Array<{
    platformId: "ondo" | "bstock" | string;
    binanceChainId: string;
    tokenContractAddress: string;
    tokenSymbol: string;
    assetType: number;
  }>;
};

export type RequestSigner = (input: {
  method: "GET" | "POST";
  path: string;
  query: string;
  body: string;
  timestamp: string;
}) => Promise<string>;

export function createHmacSigner(secret: string): RequestSigner {
  return async ({ method, path, query, body, timestamp }) => {
    const requestPath = `${path}${query ? `?${query}` : ""}`;
    const prehash = `${timestamp}${method}${requestPath}${body}`;
    return createHmac("sha256", secret).update(prehash).digest("base64");
  };
}

export function createBinanceWeb3ClientFromEnv() {
  const apiKey = process.env.BINANCE_WEB3_API_KEY;
  const apiSecret = process.env.BINANCE_WEB3_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Binance Web3 API credentials are not configured");
  }

  return new BinanceWeb3Client(apiKey, createHmacSigner(apiSecret));
}

export class BinanceWeb3Client {
  constructor(
    private readonly apiKey: string,
    private readonly signer: RequestSigner,
  ) {}

  private async request<T>(method: "GET" | "POST", path: string, params?: Record<string, string>, payload?: unknown) {
    const query = new URLSearchParams(params).toString();
    const body = payload ? JSON.stringify(payload) : "";
    const timestamp = new Date().toISOString();
    const signature = await this.signer({ method, path, query, body, timestamp });
    const response = await fetch(`${BASE_URL}${path}${query ? `?${query}` : ""}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-OC-APIKEY": this.apiKey,
        "X-OC-TIMESTAMP": timestamp,
        "X-OC-SIGN": signature,
        "X-OC-RECV-WINDOW": "5000",
      },
      body: body || undefined,
      cache: "no-store",
    });

    const result = (await response.json()) as BinanceEnvelope<T>;
    if (!response.ok || !result.success || result.code !== 0) {
      throw new Error(`Binance Web3 API ${result.code}: ${result.msg || response.statusText}`);
    }
    return result.data;
  }

  searchRwa(keyword: string, platformId?: "ondo" | "bstock") {
    return this.request<RwaSearchResult[]>("GET", "/api/v1/dex/market/rwa/search", {
      keyword,
      ...(platformId ? { platformId } : {}),
    });
  }

  getRwaPrices(tokenContractAddresses: string[]) {
    return this.request<Array<{
      binanceChainId: string;
      tokenContractAddress: string;
      platformId: string;
      tokenPrice: string;
      referencePrice: string;
      tokenPriceUpdatedAt: number;
    }>>("GET", "/api/v1/dex/market/rwa/price", {
      binanceChainId: "56",
      tokenContractAddresses: tokenContractAddresses.join(","),
    });
  }
}
