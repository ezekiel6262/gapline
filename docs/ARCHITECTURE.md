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
| Shadow Portfolio | Interactive | Browser-persisted; account database pending |
| Gap Monitor | Live | Binance public market data in production |
| Guardian policies | Interactive preview | Signing locked until quote and simulation adapters are approved |
| Weekend Cash-Out | Interactive preview | No funds move |
| Stock Gifts | UX preview | GiftEscrow deployment required |
| Goal Vaults | Interactive plan | Scheduled rebalancing pending |
| Salary Splitter | Interactive rule | Incoming-transfer monitoring pending |
| Weekend Calls | Browser-persisted | Shared leaderboard database pending |
| Monday Scorecard | Sample structure | Snapshot job and Monday-open source pending |

## Execution invariant

Every eventual money-moving action must follow:

```text
detect → executable quote → Binance transaction simulation
       → policy limits → explicit wallet approval → execute → receipt
```

The hard hackathon limit is $50 per trade. Price impact over 1%, low-confidence markets, failed simulations and exceeded daily limits must fail closed.

## Next production services

1. Account authentication and jurisdiction confirmation.
2. Durable user database for holdings, policies and action receipts.
3. Quote, swap-routing and transaction-simulation adapters.
4. Agentic Wallet execution relay with explicit user confirmation.
5. Weekend snapshot scheduler and Monday-open grading job.
6. Audited and verified GiftEscrow contract.
