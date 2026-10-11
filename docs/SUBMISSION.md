# Gapline — judge instructions

Project: a bStocks-first weekend portfolio and token-market monitoring tool on BNB Smart Chain.

- Product: https://trygapline.xyz/
- Walkthrough and mainnet receipt verifier: https://trygapline.xyz/demo
- Public repository: https://github.com/ezekiel6262/gapline
- Rules: https://www.bnbchain.org/en/hackathons/tokenized-stocks
- Project form: https://forms.gle/yToDUzaDMwWnq6R6A
- Developer-experience report form: https://forms.gle/EUQ39xf54GHjC2ys5
- Deadline: October 11, 2026, 12:00 UTC / 13:00 Lagos.

## Reproduce the working product

1. Open the product. Add a manual NVDA holding. This records a quantity; it does not purchase a token.
2. Open Gap Monitor and inspect live prices, the source label and reference provenance. Four BSC bStocks are covered: NVDAB, TSLAB, AAPLB and SPYB.
3. Sign up, save a holding and refresh. User data is authenticated and owner-scoped. Guest collections remain local.
4. Open Wallets. Browser wallet connection checks BSC chain 56 and invalidates the connection/quote when the account or chain changes. Public market prices never authorize a transaction.
5. Inspect Guardian's typed policy and preflight. Missing quote, simulation or confidence evidence blocks signing.
6. Open /demo to independently verify a supplied mainnet transaction. It requires successful execution, a canonical block, three confirmations and a positive allowlisted bStock Transfer involving the supplied address. It does not prove wallet ownership, a swap or a Gapline strategy execution.

## Local integration checks

Use Node 24 and install the repository dependencies with pnpm. Run:

```sh
npm test
npm run typecheck
npm run build
```

The private Guardian service and its isolation tests are documented in `services/guardian/README.md`. An eligible operator can connect their own Binance Agentic Wallet CLI 1.10.0 and run `scripts/verify-guardian-service.mjs` after setting `GAPLINE_BAW_ENTRY` to the official installed JavaScript entry. It performs only session/address queries and a capped quote. It signs nothing. A real local 1-USDT quote was verified during development; this is not a mainnet transaction receipt.

For a direct Binance Web3 RWA module check, supply your own developer credentials in an ignored local environment file and run:

```sh
node scripts/verify-web3-api.mjs .env.development.local
```

Never share keys with judges, commit credentials, copy wallet sessions to Vercel or proxy restricted provider calls through another region. Judges should use their own eligible accounts for private APIs. The public application remains read-only where provider access is restricted.

## Requirement evidence and honest gaps

| Requirement | Current evidence | Remaining action |
| --- | --- | --- |
| One qualifying provider central | Four bStocks, real token contract allowlist, live market monitoring and quote preparation | No Ondo/xStocks claim needed |
| Spot, BSC mainnet | Chain 56 checks; no derivatives integration | Attach genuine mainnet demo evidence |
| Working Binance Web3 API module | Signed RWA/Trading adapters implemented; production returns compliance restriction. Agentic Wallet local quote works, but is separate evidence | Demonstrate a successful required Web3 module from an eligible environment; local diagnostic needs developer credentials |
| Transaction API dry-run / small live demo | Escrow local tests and quote checks are not substitutes | Obtain real simulation and a completed mainnet flow; record only real hashes |
| Public repository | Anonymous GitHub API check returned 200 and private=false | Keep public through October 23 judging |
| Deployed link / reproducible instructions | Product, walkthrough and local instructions | Keep deployment accessible through judging |
| Developer-experience report | Official form linked; blank questions provided separately | Developer must write and submit their own experience; AI-generated reports are not accepted |
| Registration / jurisdiction eligibility | Not verified by software | Participant personally confirms eligibility and registration |
| Final submission | Forms linked; no submission receipt | Participant completes required fields and submits before deadline |
| Video, at most four minutes | Optional runbook below | Recommended, not required |

Do not label the submission fully compliant while required rows remain incomplete. A verified third-party token transfer is token-movement evidence, not proof of our execution system.

## Optional 3-minute walkthrough

- 0:00–0:25: Introduce the weekend portfolio problem and the bStocks-first scope.
- 0:25–1:05: Add a holding and show live monitoring and honest source/reference labels.
- 1:05–1:35: Sign in, refresh and show private portfolio persistence.
- 1:35–2:15: Show wallet mode separation and the Guardian fail-closed policy boundary.
- 2:15–2:45: If actually completed, show the genuine simulation, mainnet receipt and explorer. Otherwise say this remains unfinished.
- 2:45–3:00: Show public source and summarize the working core and remaining limits.

Record real screens. Do not narrate unimplemented trading, fabricate fills or present a quote as execution.
