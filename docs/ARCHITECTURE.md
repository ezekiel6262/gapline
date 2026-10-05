# Gapline architecture and readiness

## Current request path

```text
Browser
  └─ GET /api/market?ticker=NVDA
       ├─ signed Binance Web3 RWA API (preferred)
       ├─ Binance market-data-only public API (compliant fallback)
       └─ explicitly labelled recorded fixtures (last resort)
```

The API key and secret are server-only. The browser never receives either credential.

## Product state

| Capability | State | Execution boundary |
| --- | --- | --- |
| Shadow Portfolio | Live prices | Clerk authentication and private Supabase account storage |
| Gap Monitor | Live | Binance public market data in production |
| Guardian policies | Interactive preview | Signing locked until quote and simulation adapters are approved |
| Weekend Cash-Out | Interactive preview | No funds move |
| Stock Gifts | UX preview | GiftEscrow deployment required |
| Goal Vaults | Interactive plan | Scheduled rebalancing pending |
| Salary Splitter | Interactive rule | Incoming-transfer monitoring pending |
| Weekend Calls | Browser-persisted | Shared leaderboard database pending |
| Monday Scorecard | Live stored observations | Supabase minute snapshots; traditional Monday-open source pending |

## Execution invariant

Every eventual money-moving action must follow:

```text
detect → executable quote → Binance transaction simulation
       → policy limits → explicit wallet approval → execute → receipt
```

The hard hackathon limit is $50 per trade. Price impact over 1%, low-confidence markets, failed simulations and exceeded daily limits must fail closed.

## Next production services

1. Issuer jurisdiction verification before real execution.
2. Signed transaction receipts for completed wallet actions.
3. Quote, swap-routing and transaction-simulation adapters.
4. Agentic Wallet execution relay with explicit user confirmation.
5. Independent traditional-market Monday-open feed for prediction grading.
6. Audited and verified GiftEscrow contract.

## Deployed infrastructure

Clerk production credentials provide account sessions. API state routes obtain the user ID from the verified Clerk session and always scope Supabase queries to that ID. Tables enable RLS and revoke access from anonymous and authenticated Data API roles; only the server's service key can access them. Browser requests never supply an owner ID.

Supabase pg_cron calls the protected snapshot route every minute. Its credential is encrypted in Supabase Vault. A daily Vercel cron serves as backup. The first genuine observations are already stored. Public snapshot reads expose only market information.

The Agentic Wallet CLI is connected on the development computer, has returned a real quote, and currently holds no BSC tokens. Its session is not installed in Vercel. A dedicated authenticated execution worker and wallet funding are required before policies can execute.

GiftEscrow.sol is a compiled prototype with recipient-bound signatures, replay protection using chain and contract domains, expiry, and a reentrancy guard. Compilation does not constitute an audit. It is not deployed or funded.
