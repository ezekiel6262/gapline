# Private Guardian service

This is a real Binance CLI preparation adapter, not a trading worker yet. It supports authenticated health/session checks and capped BSC USDT→bStock quotes. There are deliberately no swap, send, sign or execute commands.

Run on Node 24 on a private operator host, separate from Vercel. Set `GAPLINE_BAW_ENTRY` to the absolute JavaScript entry of your installed, pinned Binance Agentic Wallet CLI (1.10.0). Set a randomly generated `GUARDIAN_SERVICE_TOKEN` of at least 32 characters and the exact Clerk `GUARDIAN_OPERATOR_USER_ID`. Keep these in the host's private secret manager/environment; never commit them or paste them into chat.

Start with `node services/guardian/server.mjs`. It binds only to 127.0.0.1:8787. A production connection requires an always-on private host, authenticated TLS ingress and renewable Binance wallet sign-in on that host. Do not expose the port directly, copy a local Binance session into Vercel, or relocate/proxy the service to evade provider restrictions.

The Vercel app requires `GUARDIAN_SERVICE_URL` (HTTPS origin), `GUARDIAN_SERVICE_TOKEN` and the matching `GUARDIAN_OPERATOR_USER_ID`. Other Clerk accounts cannot access this operator wallet. Multi-user delegated wallets need independent wallet sessions and per-user grants; the operator's funded wallet is not a shared pool.

Before enabling execution: implement independently checked RFQ typed data, security/issuer eligibility, simulation, durable atomic daily spending reservations, policy triggers, exact user authorization, risk-officer receipts, idempotency and terminal order/chain receipts. Session expiry, missing evidence and restrictions must block execution. A quote is not permission to trade.

Tests: `node --test tests/wallet.test.mjs`. Tests inject a fake CLI, bind ephemeral loopback and verify the isolation boundary. They never load real signing credentials or transfer funds.
