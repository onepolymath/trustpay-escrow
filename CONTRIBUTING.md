# Contributing

Thanks for helping make social commerce safer.

## Setup

```bash
corepack enable
pnpm install
```

Node 22 (see `.nvmrc`), pnpm 10. For the program you also need Rust (pinned in `rust-toolchain.toml`), the [Solana CLI](https://solana.com/docs/intro/installation) (Agave 2.x+) and Anchor 0.32.

## The loop

```bash
pnpm lint            # ESLint (typescript-eslint strictTypeChecked)
pnpm format:check    # Prettier
pnpm typecheck       # tsc --noEmit across the workspace
pnpm test            # SDK unit tests + web tests (no chain needed)
pnpm test:coverage   # same, with the coverage gate (90% lines / 85% branches)

pnpm build:program   # cargo build-sbf + IDL -> packages/sdk/src/idl
cargo test -p trustpay  # pure Rust unit tests (state machine, payout maths)
pnpm test:program    # LiteSVM integration tests against the compiled program
pnpm e2e             # local validator + real program + production web build + headless browser

pnpm dev             # web app on http://localhost:3000
```

## Ground rules

- **Funds only move to the order's own buyer or vendor.** Every payout account is constrained to `associated_token(order.mint, order.buyer|vendor)`. Never accept a destination from the caller.
- **One state transition per instruction**, checked with `require!` against `OrderStatus` and the clock. Windows must stay disjoint (a buyer can always dispute before anyone can auto-release).
- **Every attack gets a test.** New program paths need a LiteSVM test for the happy path and for the abuse you're preventing.
- **Seeds and account layouts are public API.** Changing them breaks every client; call it out in the PR.
- **Label mocks.** If something is simulated (demo wallets, demo faucet, demo arbiter), say so in code, README and UI.
- **No secrets in git.** Keypairs live outside the repo; `.env*` and `*-keypair.json` are ignored.

## Commits and PRs

We use [Conventional Commits](https://www.conventionalcommits.org/) (`feat(program): …`, `fix(web): …`, `docs: …`). Keep PRs focused, fill in the template, and make sure CI is green.

## Reporting security issues

Please use GitHub's private vulnerability reporting rather than a public issue. See [SECURITY.md](SECURITY.md).
