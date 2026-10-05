# Gapline

Your broker sleeps on weekends. Gapline does not.

Gapline prices a user's brokerage holdings through tokenized-stock markets on BNB Smart Chain, explains the gap from the closed reference market, and gives a scoped agent a simulation-first path to act.

## Live build

- Responsive Shadow Portfolio with manual holdings and coverage states
- Live Gap Monitor for NVDA, TSLA, AAPL and SPY
- Authenticated Binance Web3 RWA adapter with compliant public-market fallback
- Verified BSC bStock allowlist and live Binance public spot prices
- Dynamic New York market clock and Friday reference prices
- Guardian rule compiler, typed policy review and fail-closed preflight UI
- Cash-Out, Stock Gift, Goal Vault and Salary Splitter product flows
- Weekend Calls and Monday Scorecard experiences
- Clerk production sign-in with private Supabase cloud saves for holdings, policies, calls and plans
- Live Shadow Portfolio valuation and stored market observations
- Minute-by-minute Supabase snapshot job with encrypted scheduler credentials

Every non-live value is explicitly marked as sample, preview or recorded data. No screen claims that a transaction was submitted when it was not.

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

The current deployed build stops before wallet execution. The connected Agentic Wallet has no BSC funds and its signing session remains on the development computer. Guardian preflight enforces authentication and reports missing executable quote/simulation requirements. See [architecture and readiness](docs/ARCHITECTURE.md).

## Data provenance

`/api/market` first attempts the signed Binance Web3 RWA API. If that service returns a compliance restriction, it uses Binance's official market-data-only host for public ticker and kline data. If both live paths fail, it returns a clearly labelled recorded demo instead of presenting stale data as live.

## Verification

```bash
pnpm typecheck
pnpm build
```

Production: https://gapline-mu.vercel.app
