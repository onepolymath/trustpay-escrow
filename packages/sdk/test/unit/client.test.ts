import { Connection, Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import { TRUSTPAY_PROGRAM_ID, TrustPayClient } from "../../src/index.js";
import { makeOrder } from "./fixtures.js";

// Instruction builders never touch the network, so an unreachable endpoint is fine.
const client = new TrustPayClient(new Connection("http://127.0.0.1:1"));
const vendor = Keypair.generate().publicKey;

describe("TrustPayClient builders", () => {
  it("targets the TrustPay program", async () => {
    const ix = await client.registerVendor({ vendor, handle: "@shop" });
    expect(ix.programId.equals(TRUSTPAY_PROGRAM_ID)).toBe(true);
    expect(ix.keys[0]?.pubkey.equals(vendor)).toBe(true);
    expect(ix.keys[0]?.isSigner).toBe(true);
  });

  it("validates text lengths before building", () => {
    expect(() => client.registerVendor({ vendor, handle: "" })).toThrow("Handle is required");
    expect(() => client.registerVendor({ vendor, handle: "x".repeat(33) })).toThrow(
      "at most 32 bytes",
    );
    expect(() => client.markShipped(makeOrder(), "x".repeat(65))).toThrow("Tracking");
    expect(() => client.openDispute(makeOrder(), " ")).toThrow("Reason is required");
  });

  it("counts multi-byte characters as bytes, like the program", () => {
    expect(() => client.registerVendor({ vendor, handle: "🛍️".repeat(9) })).toThrow(
      "at most 32 bytes",
    );
  });

  it("rejects non-positive amounts and invalid splits", () => {
    expect(() =>
      client.createOrder({
        vendor,
        mint: vendor,
        orderId: 0n,
        amount: 0n,
        title: "x",
        shipWindowSecs: 60,
        confirmWindowSecs: 60,
      }),
    ).toThrow("greater than zero");
    for (const buyerBps of [-1, 10_001, 0.5]) {
      expect(() =>
        client.resolveDispute({ arbiter: vendor, order: makeOrder(), buyerBps }),
      ).toThrow("buyerBps");
    }
  });

  it("refuses buyer-side instructions on unfunded orders", () => {
    const o = makeOrder({ buyer: null });
    expect(() => client.confirmDelivery(o)).toThrow("no buyer");
    expect(() => client.refundByVendor(o)).toThrow("no buyer");
  });

  it("derives addresses consistently", () => {
    expect(client.orderAddress(vendor, 1n).equals(client.orderAddress(vendor, 1n))).toBe(true);
    expect(client.configAddress().equals(client.vendorAddress(vendor))).toBe(false);
  });
});
