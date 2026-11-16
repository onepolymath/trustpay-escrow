import type { BN, IdlAccounts } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import type { Trustpay } from "./idl/trustpay.js";
import type { ConfigAccount, OrderAccount, OrderStatus, VendorProfileAccount } from "./types.js";
import { ORDER_STATUSES } from "./types.js";

export type RawConfig = IdlAccounts<Trustpay>["config"];
export type RawVendorProfile = IdlAccounts<Trustpay>["vendorProfile"];
export type RawOrder = IdlAccounts<Trustpay>["order"];

const toBigInt = (v: BN): bigint => BigInt(v.toString());
const toNumber = (v: BN): number => Number(v.toString());
const toTimestamp = (v: BN): number | null => {
  const n = toNumber(v);
  return n === 0 ? null : n;
};

/** Anchor encodes enums as `{ variantName: {} }`. */
export function decodeStatus(raw: object): OrderStatus {
  const [key] = Object.keys(raw);
  const status = ORDER_STATUSES.find((s) => s === key);
  if (!status) throw new Error(`Unknown order status: ${String(key)}`);
  return status;
}

export function decodeConfig(address: PublicKey, raw: RawConfig): ConfigAccount {
  return {
    address,
    admin: raw.admin,
    arbiter: raw.arbiter,
    minWindowSecs: toNumber(raw.minWindowSecs),
    maxWindowSecs: toNumber(raw.maxWindowSecs),
    orderCount: toBigInt(raw.orderCount),
  };
}

export function decodeVendorProfile(
  address: PublicKey,
  raw: RawVendorProfile,
): VendorProfileAccount {
  return {
    address,
    vendor: raw.vendor,
    handle: raw.handle,
    ordersCreated: toBigInt(raw.ordersCreated),
    completed: raw.completed,
    refunded: raw.refunded,
    missedShipments: raw.missedShipments,
    disputesOpened: raw.disputesOpened,
    disputesWon: raw.disputesWon,
    disputesLost: raw.disputesLost,
    volumeSettled: toBigInt(raw.volumeSettled),
    createdAt: toNumber(raw.createdAt),
    lastActivityAt: toNumber(raw.lastActivityAt),
  };
}

export function decodeOrder(address: PublicKey, raw: RawOrder): OrderAccount {
  return {
    address,
    vendor: raw.vendor,
    buyer: raw.buyer.equals(PublicKey.default) ? null : raw.buyer,
    reservedBuyer: raw.reservedBuyer,
    mint: raw.mint,
    orderId: toBigInt(raw.orderId),
    amount: toBigInt(raw.amount),
    status: decodeStatus(raw.status),
    shipWindowSecs: toNumber(raw.shipWindowSecs),
    confirmWindowSecs: toNumber(raw.confirmWindowSecs),
    createdAt: toNumber(raw.createdAt),
    fundedAt: toTimestamp(raw.fundedAt),
    shipBy: toTimestamp(raw.shipBy),
    shippedAt: toTimestamp(raw.shippedAt),
    releaseAfter: toTimestamp(raw.releaseAfter),
    settledAt: toTimestamp(raw.settledAt),
    buyerPayout: toBigInt(raw.buyerPayout),
    vendorPayout: toBigInt(raw.vendorPayout),
    title: raw.title,
    tracking: raw.tracking,
    disputeReason: raw.disputeReason,
  };
}
