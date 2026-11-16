import { Keypair } from "@solana/web3.js";

/**
 * Demo wallets are throwaway devnet keypairs kept in localStorage so anyone can try the full
 * buyer ↔ vendor flow without installing a wallet. Never use them for real funds.
 */
const KEY = "trustpay.demo-wallets.v1";

export type DemoRole = "buyer" | "vendor";
export type DemoWallets = Record<DemoRole, Keypair>;

export function loadDemoWallets(): DemoWallets | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<DemoRole, number[]>;
    return {
      buyer: Keypair.fromSecretKey(Uint8Array.from(parsed.buyer)),
      vendor: Keypair.fromSecretKey(Uint8Array.from(parsed.vendor)),
    };
  } catch {
    window.localStorage.removeItem(KEY);
    return null;
  }
}

export function createDemoWallets(): DemoWallets {
  const wallets = { buyer: Keypair.generate(), vendor: Keypair.generate() };
  window.localStorage.setItem(
    KEY,
    JSON.stringify({
      buyer: Array.from(wallets.buyer.secretKey),
      vendor: Array.from(wallets.vendor.secretKey),
    }),
  );
  return wallets;
}

export function clearDemoWallets(): void {
  window.localStorage.removeItem(KEY);
}
