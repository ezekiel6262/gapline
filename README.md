# Gapline

Your broker sleeps on weekends. Gapline does not.

Gapline prices a user's brokerage holdings through tokenized-stock markets on BNB Smart Chain, explains the gap from the closed reference market, and gives a scoped agent a simulation-first path to act.

## Current build

- Responsive Weekend dashboard based on the supplied high-fidelity design
- Shadow Portfolio with coverage states and weekend P&L
- Interactive Gap Monitor for NVDA, TSLA, AAPL and SPY
- Depth-weighted implied-open calculation and confidence grading
- Server route for market summaries (`/api/market?ticker=NVDA`)
- Typed Binance Web3 RWA client boundary ready for authenticated signing
- Recorded demo fixtures while credentials are unavailable

Guardian, Money, Calls, Scorecard, persistence, authentication and onchain execution are represented in the navigation and will be implemented behind the same design and API boundaries.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` and add credentials only on the server. Never prefix Binance secrets with `NEXT_PUBLIC_`.

## Safety invariant

The execution pipeline must always be: detect → quote → simulate → enforce policy limits → execute → log. A failed simulation or breached limit must never reach the wallet.
