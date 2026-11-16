import { PublicKey } from "@solana/web3.js";

import { IDL } from "./idl/idl.js";

/** Program id, read from the IDL so it can never drift from the deployed build. */
export const TRUSTPAY_PROGRAM_ID = new PublicKey(IDL.address);

export const CONFIG_SEED = "config";
export const VENDOR_SEED = "vendor";
export const ORDER_SEED = "order";

export const MAX_HANDLE_LEN = 32;
export const MAX_TITLE_LEN = 64;
export const MAX_TRACKING_LEN = 64;
export const MAX_REASON_LEN = 160;
export const BPS_DENOMINATOR = 10_000;

/** Circle's official devnet USDC mint. */
export const DEVNET_USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

/** Byte offsets inside an `Order` account (after the 8-byte discriminator), for memcmp filters. */
export const ORDER_OFFSETS = {
  vendor: 8,
  buyer: 8 + 32,
} as const;
