import { Keypair } from "@solana/web3.js";

import type { OrderAccount, VendorProfileAccount } from "../../src/index.js";

export const vendor = Keypair.generate().publicKey;
export const buyer = Keypair.generate().publicKey;
export const arbiter = Keypair.generate().publicKey;
export const stranger = Keypair.generate().publicKey;

export function makeOrder(overrides: Partial<OrderAccount> = {}): OrderAccount {
  return {
    address: Keypair.generate().publicKey,
    vendor,
    buyer,
    reservedBuyer: false,
    mint: Keypair.generate().publicKey,
    orderId: 0n,
    amount: 25_000_000n,
    status: "funded",
    shipWindowSecs: 86_400,
    confirmWindowSecs: 86_400,
    createdAt: 1_000,
    fundedAt: 1_100,
    shipBy: 87_500,
    shippedAt: null,
    releaseAfter: null,
    settledAt: null,
    buyerPayout: 0n,
    vendorPayout: 0n,
    title: "Ankara wrap dress",
    tracking: "",
    disputeReason: "",
    ...overrides,
  };
}

export function makeProfile(overrides: Partial<VendorProfileAccount> = {}): VendorProfileAccount {
  return {
    address: Keypair.generate().publicKey,
    vendor,
    handle: "@ummie.styles",
    ordersCreated: 0n,
    completed: 0,
    refunded: 0,
    missedShipments: 0,
    disputesOpened: 0,
    disputesWon: 0,
    disputesLost: 0,
    volumeSettled: 0n,
    createdAt: 0,
    lastActivityAt: 0,
    ...overrides,
  };
}
