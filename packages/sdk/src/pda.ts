import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

import { CONFIG_SEED, ORDER_SEED, TRUSTPAY_PROGRAM_ID, VENDOR_SEED } from "./constants.js";

const enc = new TextEncoder();

export const BPF_LOADER_UPGRADEABLE_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111",
);

/** Little-endian u64, matching `order_id.to_le_bytes()` on chain. */
export function u64Le(value: bigint): Uint8Array {
  if (value < 0n || value > 0xffff_ffff_ffff_ffffn) {
    throw new RangeError(`u64 out of range: ${value.toString()}`);
  }
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, value, true);
  return out;
}

export function findConfigPda(programId = TRUSTPAY_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync([enc.encode(CONFIG_SEED)], programId)[0];
}

export function findVendorPda(vendor: PublicKey, programId = TRUSTPAY_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync(
    [enc.encode(VENDOR_SEED), vendor.toBytes()],
    programId,
  )[0];
}

export function findOrderPda(
  vendor: PublicKey,
  orderId: bigint,
  programId = TRUSTPAY_PROGRAM_ID,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [enc.encode(ORDER_SEED), vendor.toBytes(), u64Le(orderId)],
    programId,
  )[0];
}

/** The escrow vault: the order PDA's associated token account for the order's mint. */
export function findVaultAddress(order: PublicKey, mint: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, order, true);
}

export function findProgramDataAddress(programId = TRUSTPAY_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync([programId.toBytes()], BPF_LOADER_UPGRADEABLE_ID)[0];
}
