import { NextResponse } from "next/server";
import { marketSummary, markets } from "@/lib/demo-data";
import { createBinanceWeb3ClientFromEnv } from "@/lib/binance/client";
import { confidence, impliedOpen, percentChange, type IssuerPrice } from "@/lib/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "sin1";

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.toUpperCase() ?? "NVDA";
  if (!(ticker in markets)) {
    return NextResponse.json({ error: "Ticker not covered" }, { status: 404 });
  }

  if (!process.env.BINANCE_WEB3_API_KEY || !process.env.BINANCE_WEB3_API_SECRET) {
    return NextResponse.json({ source: "recorded-demo", updatedAt: new Date().toISOString(), ...marketSummary(ticker) });
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
    const issuers: IssuerPrice[] = prices.map((price) => ({
      issuer: price.platformId === "bstock" ? "bStocks" : price.platformId === "ondo" ? "Ondo" : "xStocks",
      price: Number(price.tokenPrice),
      depthUsd: 0,
    }));
    const reference = Number(prices[0]?.referencePrice);
    const implied = impliedOpen(issuers);

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
    return NextResponse.json(
      { error: "Live Binance market data is temporarily unavailable" },
      { status: 502 },
    );
  }
}
