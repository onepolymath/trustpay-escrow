import type { PublicKey } from "@solana/web3.js";

export const ORDER_STATUSES = [
  "created",
  "funded",
  "shipped",
  "disputed",
  "completed",
  "refunded",
  "resolved",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "completed",
  "refunded",
  "resolved",
  "cancelled",
]);

export interface ConfigAccount {
  address: PublicKey;
  admin: PublicKey;
  arbiter: PublicKey;
  minWindowSecs: number;
  maxWindowSecs: number;
  orderCount: bigint;
}

export interface VendorProfileAccount {
  address: PublicKey;
  vendor: PublicKey;
  handle: string;
  ordersCreated: bigint;
  completed: number;
  refunded: number;
  missedShipments: number;
  disputesOpened: number;
  disputesWon: number;
  disputesLost: number;
  volumeSettled: bigint;
  createdAt: number;
  lastActivityAt: number;
}

export interface OrderAccount {
  address: PublicKey;
  vendor: PublicKey;
  /** `null` until funded, unless the vendor reserved the order for a specific buyer. */
  buyer: PublicKey | null;
  reservedBuyer: boolean;
  mint: PublicKey;
  orderId: bigint;
  amount: bigint;
  status: OrderStatus;
  shipWindowSecs: number;
  confirmWindowSecs: number;
  createdAt: number;
  fundedAt: number | null;
  shipBy: number | null;
  shippedAt: number | null;
  releaseAfter: number | null;
  settledAt: number | null;
  buyerPayout: bigint;
  vendorPayout: bigint;
  title: string;
  tracking: string;
  disputeReason: string;
}
