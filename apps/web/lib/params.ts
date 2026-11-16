import { PublicKey } from "@solana/web3.js";

/** Validates `/o/[vendor]/[id]` route params. Returns null for anything malformed. */
export function parseOrderParams(params: {
  vendor: string;
  id: string;
}): { vendor: PublicKey; orderId: bigint } | null {
  if (!/^\d{1,20}$/.test(params.id)) return null;
  const orderId = BigInt(params.id);
  if (orderId > 0xffff_ffff_ffff_ffffn) return null;
  const vendor = parsePublicKey(params.vendor);
  return vendor ? { vendor, orderId } : null;
}

export function parsePublicKey(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}
