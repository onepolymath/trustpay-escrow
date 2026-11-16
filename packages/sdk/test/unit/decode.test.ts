import { BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import type { RawOrder } from "../../src/index.js";
import { decodeOrder, decodeStatus } from "../../src/index.js";

describe("decode", () => {
  it("maps Anchor enum objects to status strings", () => {
    expect(decodeStatus({ shipped: {} })).toBe("shipped");
    expect(() => decodeStatus({ bogus: {} })).toThrow("Unknown order status");
  });

  it("converts BN fields and zero timestamps", () => {
    const raw = {
      vendor: Keypair.generate().publicKey,
      buyer: PublicKey.default,
      reservedBuyer: false,
      mint: Keypair.generate().publicKey,
      orderId: new BN(3),
      amount: new BN("18446744073709551615"),
      status: { created: {} },
      shipWindowSecs: new BN(60),
      confirmWindowSecs: new BN(120),
      createdAt: new BN(1_700_000_000),
      fundedAt: new BN(0),
      shipBy: new BN(0),
      shippedAt: new BN(0),
      releaseAfter: new BN(0),
      settledAt: new BN(0),
      buyerPayout: new BN(0),
      vendorPayout: new BN(0),
      title: "t",
      tracking: "",
      disputeReason: "",
      bump: 255,
    } as unknown as RawOrder;
    const o = decodeOrder(Keypair.generate().publicKey, raw);
    expect(o.buyer).toBeNull();
    expect(o.amount).toBe(2n ** 64n - 1n);
    expect(o.fundedAt).toBeNull();
    expect(o.createdAt).toBe(1_700_000_000);
    expect(o.status).toBe("created");
  });
});
