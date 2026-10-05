# Gapline launch status

## Verified live

- Public deployment is built from the GitHub main branch, then promoted on Vercel.
- Live Binance public token market prices for NVDA, TSLA, AAPL and SPY on BNB Smart Chain.
- Supabase market observations written every minute; protected scheduler credentials in Vault.
- Private cloud collections require verified Clerk identity; anonymous requests receive 401.
- Owner-filtered persistence and collection validation; guest plans stored locally.
- Guardian policy compiler and authenticated preflight fail closed without quote, simulation and confidence evidence.
- Cash-out/gift/vault/splitter planning inputs are saved as plans, not transactions.

## Not live — do not represent these as completed

1. Production sign-in: the managed Clerk instance expects a custom DNS subdomain. The provider rejects API changes to its domain proxy setting. A custom domain controlled by the owner is needed, or an alternative production authentication setup must be chosen. Development credentials have not been substituted.
2. Wallet execution: the connected local Binance Agentic Wallet has no spendable BSC balance. A funded wallet, explicit transaction authorization, live execution adapter and complete safety evidence are required. Local wallet sessions must never be copied into public server environment variables.
3. Gift escrow: Solidity prototype compiles but is not audited, behaviorally tested or deployed. No gifts can be funded or claimed yet.
4. Vault and salary automations: saved plans only; no transfers, subscription or rebalance execution is active.
5. Monday prediction grading: requires an independent traditional-equity opening feed. Current references are Friday UTC token-market closes, not traditional brokerage closes.
6. Hackathon delivery: a walkthrough video, final submission and user-authored developer-experience report remain. Do not fabricate any required mainnet transaction hash.

## Checks

`npm run typecheck`, `npm run build`, `node --test tests/*.test.mjs`

After pulling production environment variables: `node scripts/check-production.mjs --live` and `node scripts/verify-scheduler.mjs`. These scripts report statuses, not credentials.
