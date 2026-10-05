import { NextResponse } from "next/server";
import { marketSummary, markets } from "@/lib/demo-data";
import { createBinanceWeb3ClientFromEnv } from "@/lib/binance/client";
import { getPublicBstockMarket } from "@/lib/binance/public-rwa";
import { confidence, impliedOpen, percentChange, type IssuerPrice } from "@/lib/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function publicMarketSummary(ticker: string, authenticatedError?: unknown) {
  try {
    const market = await getPublicBstockMarket(ticker);
    if (!market) return null;

    const reference = market.referencePrice;
    const issuers: IssuerPrice[] = [{ issuer: market.issuer, price: market.price, depthUsd: 0 }];

    return {
      source: "live-binance-public",
      updatedAt: market.updatedAt,
      reference,
      issuers,
      implied: market.price,
      gap: percentChange(market.price, reference),
      confidence: confidence(issuers),
      history: market.history,
      depthStatus: "pending-quote-integration",
      market: {
        issuer: market.issuer,
        pair: market.pair,
        chainId: market.chainId,
        contractAddress: market.contractAddress,
      },
      provenance: {
        catalog: "Verified allowlist from Binance public RWA catalog",
        price: "Binance market-data-only public API",
        reference: `Binance public spot Friday close (${market.referenceUpdatedAt})`,
      },
      authenticatedApiStatus: authenticatedError ? "compliance-restricted" : "not-configured",
    };
  } catch (error) {
    console.error("Public Binance fallback failed", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.toUpperCase() ?? "NVDA";
  if (!(ticker in markets)) {
    return NextResponse.json({ error: "Ticker not covered" }, { status: 404 });
  }

  if (!process.env.BINANCE_WEB3_API_KEY || !process.env.BINANCE_WEB3_API_SECRET) {
    const fallback = await publicMarketSummary(ticker);
    return NextResponse.json(fallback ?? {
      source: "recorded-demo",
      updatedAt: new Date().toISOString(),
      ...marketSummary(ticker),
      warning: "Live public market data is temporarily unavailable",
    });
  }

  try {
    const client = createBinanceWeb3ClientFromEnv();
    const matches = await client.searchRwa(ticker);
    const assets = matches
      .find((match) => match.ticker.toUpperCase() === ticker)
      ?.assets.filter((asset) => asset.binanceChainId === "56" && ["ondo", "bstock"].includes(asset.platformId)) ?? [];

    if (!assets.length) {
      return NextResponse.json({ error: `${ticker} has no supported BSC tokenized-stock market` }, { status: 404 });
    }

    const prices = await client.getRwaPrices(assets.map((asset) => asset.tokenContractAddress));
    if (!prices.length || prices.some(price => !Number.isFinite(Number(price.tokenPrice)) || Number(price.tokenPrice) <= 0)) {
      throw new Error('Authenticated API returned no usable prices');
    }
    const issuers: IssuerPrice[] = prices.map((price) => ({
      issuer: price.platformId === "bstock" ? "bStocks" : price.platformId === "ondo" ? "Ondo" : "xStocks",
      price: Number(price.tokenPrice),
      depthUsd: 0,
    }));
    const reference = Number(prices[0]?.referencePrice);
    const implied = issuers.reduce((sum,issuer)=>sum+issuer.price,0)/issuers.length;
    if (!Number.isFinite(reference) || reference <= 0) throw new Error('Authenticated reference price unavailable');

    return NextResponse.json({
      source: "live-binance-rwa",
      updatedAt: new Date(Math.max(...prices.map((price) => price.tokenPriceUpdatedAt))).toISOString(),
      reference,
      issuers,
      implied,
      gap: percentChange(implied, reference),
      confidence: confidence(issuers),
      history: markets[ticker].history,
      depthStatus: "pending-quote-integration",
    });
  } catch (error) {
    console.error("Binance RWA request failed", error instanceof Error ? error.message : "Unknown error");
    const fallback = await publicMarketSummary(ticker, error);
    return NextResponse.json(fallback ?? {
      source: "recorded-demo",
      updatedAt: new Date().toISOString(),
      ...marketSummary(ticker),
      warning: "Live Binance market data is temporarily unavailable",
    });
  }
}
