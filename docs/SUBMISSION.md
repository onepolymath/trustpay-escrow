# Dev3pack submission

Copy-paste text for the Dev3pack dashboard. Fields marked ⚠️ need checking just before submitting.

| Field                        | Value                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Project name**             | TrustPay                                                                                                                                                                             |
| **One-liner**                | Scam-proof social-commerce payments on Solana: buyers pay into an escrow PDA, vendors get paid on delivery, and every vendor carries an on-chain reputation.                         |
| **Track**                    | Main Solana track (Best App Overall)                                                                                                                                                 |
| **Team**                     | Yusuf Ojo Raifu (solo)                                                                                                                                                               |
| **Repository**               | https://github.com/onepolymath/trustpay-escrow                                                                                                                                       |
| **Live demo**                | https://trustpay-escrow.vercel.app ⚠️                                                                                                                                                |
| **Program address (devnet)** | `CvbRGAvMeDB3Up6fYa4xBX2GVdYdRKCpq4L5FLaThRBg` ⚠️ confirm it's deployed: [Explorer](https://explorer.solana.com/address/CvbRGAvMeDB3Up6fYa4xBX2GVdYdRKCpq4L5FLaThRBg?cluster=devnet) |
| **Video**                    | ⚠️ link after upload (under 3 minutes, script in [DEMO_SCRIPT.md](DEMO_SCRIPT.md))                                                                                                   |
| **Stack**                    | Anchor 0.32 (Rust), SPL Token, Solana Actions/Blinks, Solana Pay, Next.js 16, React 19, Tailwind 4, Wallet Adapter (Wallet Standard), LiteSVM, Vitest, Playwright                    |

## Short description (≈100 words)

Across Nigeria and the Global South, people buy from Instagram and WhatsApp vendors by bank transfer, and "pay first, no delivery" is the most common scam. TrustPay replaces "send to my account" with a link. The vendor shares an order as a link, a Blink or a Solana Pay QR. The buyer's USDC goes into a program-owned escrow. It releases when the buyer confirms delivery or automatically after a timeout. A dispute freezes it for an arbiter who can only split it between the two parties. Every outcome updates the vendor's on-chain reputation, so the next buyer knows who they're dealing with.

## Long description

**Problem.** Social commerce in Nigeria runs on DMs and bank transfers. Buyers get hit by "pay first, no delivery", vendors by fake payment screenshots and reversals. Follower counts and testimonial screenshots are trivially faked, so trust is low and honest small vendors lose sales.

**What we built.**

- **Anchor escrow program** (13 instructions). Orders move Open → Funded → Shipped → Completed, with escape hatches for every failure:
  - the buyer reclaims everything if the vendor misses the ship-by deadline;
  - anyone can crank an auto-release if the buyer goes quiet after shipping;
  - the vendor can refund;
  - the buyer can dispute, freezing funds for an arbiter.
- **Payout safety.** Funds can only ever move to the order's own buyer and vendor token accounts. The dispute and auto-release windows are exact complements, so they can't race. Only the program's upgrade authority can initialise the config.
- **On-chain vendor reputation.** Delivered orders, refunds, missed shipments, disputes won and lost, and volume are written by the program on every settlement. The SDK turns them into a Bayesian trust score (missed shipments weigh double).
- **Typed TypeScript SDK** (`@trustpay/sdk`): instruction builders, PDA helpers, decoders, lifecycle rules (which role can do what, when) and link helpers.
- **Web app** (Next.js on Vercel), with dark and light themes and mobile layouts:
  - vendor console with a share sheet (link, Blink, Solana Pay QR, WhatsApp);
  - buyer order page with a live countdown and timeline;
  - arbiter dispute queue;
  - public vendor reputation pages.
- **Solana Actions.** `actions.json` and action endpoints let buyers pay straight from a Blink in X or Discord, or by scanning a QR.
- **Demo mode** so judges can try every role without a wallet extension. Burner wallets, a devnet test-token faucet and a hosted demo arbiter are all clearly labelled.

**Quality.**

- 123 automated tests:
  - 37 LiteSVM scenarios run against the compiled program, including attack cases such as arbiter redirection, conflict of interest, double-settle, the deadline race and stray tokens;
  - 66 SDK unit tests (98.6% SDK line coverage together with the LiteSVM suite);
  - 10 Rust unit tests;
  - 10 web tests;
  - a Playwright E2E that drives the production UI against a local validator.
- Strict TypeScript, ESLint, Prettier and CI.
- A threat model that maps every attack to a test.

**What's mocked.**

- The live demo uses a devnet test token (`tUSDC`) and a server-held arbiter key, so anyone can play every role.
- The program itself works with any SPL mint, including devnet USDC.
- In production the arbiter would be a Squads multisig.

**Built before vs during.** Dev3pack allows early building if it's disclosed. Work started on 16 Nov 2026 in this repository, and the full history is public. No code was reused from earlier projects.

**Next.**

- Squads multisig arbiter, then a staked juror panel
- Mainnet USDC after an audit
- Naira on/off-ramp partners
- Delivery oracles from logistics partners
- Seeker/mobile PWA

## Checklist before submitting

- [ ] Program deployed to devnet and `pnpm bootstrap` run (config initialised)
- [ ] Vercel env vars set (see `.env.example`) and the live demo walks through the full flow
- [ ] Video recorded (under 3:00) and uploaded; link pasted above
- [ ] README "Built before vs during" section is still accurate; list the weekend commits below
- [ ] Repository is public, MIT licensed, CI green

### Commits during the hackathon weekend (27–29 Nov)

<!-- git log --since=2026-11-27 --until=2026-11-30 --oneline -->

_To fill in on submission day._
