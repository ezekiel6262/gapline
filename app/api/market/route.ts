import { NextResponse } from "next/server";
import { marketSummary, markets } from "@/lib/demo-data";

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.toUpperCase() ?? "NVDA";
  if (!(ticker in markets)) {
    return NextResponse.json({ error: "Ticker not covered" }, { status: 404 });
  }
  return NextResponse.json({ source: "recorded-demo", updatedAt: new Date().toISOString(), ...marketSummary(ticker) });
}
