import "server-only";

import { Keypair } from "@solana/web3.js";

/** Loads a devnet keypair from an env var holding the JSON byte array `solana-keygen` writes. */
export function keypairFromEnv(name: string): Keypair | null {
  const raw = process.env[name];
  if (!raw) return null;
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
  } catch {
    throw new Error(`${name} is not a valid keypair JSON array`);
  }
}

/** Demo-only endpoints must never run against mainnet. */
export function assertDevnet(rpcUrl: string): void {
  if (/mainnet/i.test(rpcUrl)) throw new Error("Demo endpoints are disabled on mainnet");
}
