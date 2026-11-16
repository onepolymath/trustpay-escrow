import { DEVNET_USDC_MINT } from "@trustpay/sdk";
import { PublicKey } from "@solana/web3.js";

/** Public, build-time configuration. Everything here is safe to ship to the browser. */
export const CLUSTER = "devnet" as const;
export const RPC_URL = process.env["NEXT_PUBLIC_RPC_URL"] ?? "https://api.devnet.solana.com";
export const SITE_URL = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

/** The SPL mint orders are priced in. Defaults to Circle's devnet USDC. */
export const PAYMENT_MINT = new PublicKey(
  process.env["NEXT_PUBLIC_PAYMENT_MINT"] ?? DEVNET_USDC_MINT.toBase58(),
);
export const PAYMENT_SYMBOL = process.env["NEXT_PUBLIC_PAYMENT_SYMBOL"] ?? "USDC";
export const PAYMENT_DECIMALS = 6;

/** Demo mode: in-browser burner wallets, a devnet faucet and a hosted demo arbiter. */
export const DEMO_ENABLED = process.env["NEXT_PUBLIC_DEMO"] === "1";

export const REPO_URL = "https://github.com/onepolymath/trustpay-escrow";

/** Window presets offered in the UI. The program enforces the real bounds from its config. */
export const WINDOW_PRESETS = [
  { label: "2 minutes (demo)", secs: 120, demoOnly: true },
  { label: "1 day", secs: 86_400, demoOnly: false },
  { label: "3 days", secs: 3 * 86_400, demoOnly: false },
  { label: "7 days", secs: 7 * 86_400, demoOnly: false },
  { label: "14 days", secs: 14 * 86_400, demoOnly: false },
] as const;
