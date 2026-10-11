# Gapline

Your broker sleeps on weekends. Gapline does not.

Gapline is a bStocks-first weekend portfolio and token-market monitoring tool on BNB Smart Chain. The current fallback reference is a Friday UTC token-market close, not an independently verified underlying-equity close. Execution remains locked.

Judge walkthrough: https://trygapline.xyz/demo · [Submission instructions](docs/SUBMISSION.md).

## Live build

- Responsive Shadow Portfolio with manual holdings and coverage states
- Live Gap Monitor for NVDA, TSLA, AAPL and SPY
- Authenticated Binance Web3 RWA adapter with compliant public-market fallback
- Verified BSC bStock allowlist and live Binance public spot prices
- Dynamic New York market clock and Friday reference prices
- Guardian rule compiler, typed policy review and fail-closed preflight UI
- Cash-Out, Stock Gift, Goal Vault and Salary Splitter planning previews (not transactions)
- Personal Weekend Calls and stored-observation Scorecard (no automatic Monday grading)
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

The current deployed build stops before wallet execution. The local Agentic Wallet was funded with USDT; its signing session remains private on the development computer. Guardian preflight reports missing executable quote/simulation requirements. Browser wallet connection, private quote preparation and read-only BSC receipt verification are implemented; continuous Guardian hosting and signing are not. See [architecture and readiness](docs/ARCHITECTURE.md).

## Data provenance

`/api/market` first attempts the signed Binance Web3 RWA API. If that service returns a compliance restriction, it uses Binance's official market-data-only host for public ticker and kline data. If both live paths fail, it returns a clearly labelled recorded demo instead of presenting stale data as live.

## Verification

```bash
pnpm typecheck
pnpm build
```

Production: https://trygapline.xyz (legacy: https://gapline-mu.vercel.app)
# Custom-domain authentication

`trygapline.xyz` selects `NEXT_PUBLIC_GAPLINE_CUSTOM_CLERK_PUBLISHABLE_KEY` and `GAPLINE_CUSTOM_CLERK_SECRET_KEY`. The legacy Vercel address retains its original Clerk variables and `/__clerk` proxy. `CLERK_ENCRYPTION_KEY` is required for secure propagation of the custom server credentials; never expose it or any secret key to client components.

The middleware pins authenticated requests to the issuer configured for each host. Regression checks: `node --test tests/clerk-host-config.test.mjs tests/clerk-proxy.test.mjs`. The opt-in integration script `scripts/verify-custom-auth.mjs` creates temporary test accounts, checks private cloud ownership, revokes its sessions and removes only its own fixtures. It requires ignored `.env.replacement.local` configuration. It does not replace a manual browser sign-up and email-delivery check.

