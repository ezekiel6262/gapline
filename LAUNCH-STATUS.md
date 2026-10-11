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

1. Production authentication: `trygapline.xyz` uses the separate `gapline-custom-auth` instance and verified custom-domain DNS. The legacy Vercel host retains its original verified proxy. Per-host credentials and JWT issuer restrictions keep the instances separate. Authenticated save/read and account-isolation checks pass with temporary test accounts; browser sign-up and email verification still require a manual check because browser automation is unavailable. Accounts do not automatically transfer between instances.
2. Dual wallet preparation: the Wallets panel connects EIP-1193/EIP-6963 browser wallets, checks BSC/account changes and requests authenticated Binance RFQ quotes. A separate private, operator-authenticated Binance CLI service supports session health and real capped bStock quotes; a live local 1-USDT quote passed. The production Guardian host is not configured. Both paths explicitly disable signing: RFQ typed-order verification, issuer eligibility, simulation, durable spending reservations, policy triggers, risk-officer authorization and terminal receipts remain. Vercel quote requests may be provider-restricted and never fall back to a proxy. The local wallet was funded (4 USDT observed October 10); it is not a public shared wallet. Never copy its session into public server environment variables.
3. Gift escrow: local-chain behavioral tests now pass for deposits, recipient/chain/contract-bound signatures, replay rejection, expiry, sender-only reclaim, transfer-fee rejection and payout-failure rollback. This is not an independent audit; the contract is not deployed and no public gifts can be funded or claimed yet.
4. Vault and salary automations: saved plans only; no transfers, subscription or rebalance execution is active.
5. Monday prediction grading: requires an independent traditional-equity opening feed. Current references are Friday UTC token-market closes, not traditional brokerage closes.
6. Hackathon delivery: a walkthrough video, final submission and user-authored developer-experience report remain. Do not fabricate any required mainnet transaction hash.

## Checks

`npm run typecheck`, `npm run build`, `node --test tests/*.test.mjs`

After pulling production environment variables: `node scripts/check-production.mjs --live` and `node scripts/verify-scheduler.mjs`. These scripts report statuses, not credentials.
