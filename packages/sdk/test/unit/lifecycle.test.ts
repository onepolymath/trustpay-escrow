import { describe, expect, it } from "vitest";

import {
  STATUS_LABEL,
  activeDeadline,
  availableActions,
  roleOf,
  timeline,
} from "../../src/index.js";
import { arbiter, buyer, makeOrder, stranger, vendor } from "./fixtures.js";

const kinds = (...args: Parameters<typeof availableActions>) =>
  availableActions(...args).map((a) => a.kind);

describe("roleOf", () => {
  it("identifies each party", () => {
    const o = makeOrder();
    expect(roleOf(o, { wallet: null, arbiter })).toBe("visitor");
    expect(roleOf(o, { wallet: vendor, arbiter })).toBe("vendor");
    expect(roleOf(o, { wallet: buyer, arbiter })).toBe("buyer");
    expect(roleOf(o, { wallet: arbiter, arbiter })).toBe("arbiter");
    expect(roleOf(o, { wallet: stranger, arbiter: null })).toBe("visitor");
  });

  it("does not treat a reserved-but-unpaid buyer as the buyer yet", () => {
    const o = makeOrder({ status: "created", reservedBuyer: true });
    expect(roleOf(o, { wallet: buyer, arbiter })).toBe("visitor");
  });
});

describe("availableActions", () => {
  const ctx = (wallet: typeof vendor | null, nowSecs = 2_000) => ({ wallet, arbiter, nowSecs });

  it("created: anyone can pay, the vendor can cancel", () => {
    const o = makeOrder({ status: "created", buyer: null, fundedAt: null, shipBy: null });
    expect(kinds(o, ctx(stranger))).toEqual(["fund"]);
    expect(kinds(o, ctx(vendor))).toEqual(["cancel"]);
    expect(kinds(o, ctx(null))).toEqual([]);
  });

  it("created + reserved: only the reserved buyer can pay", () => {
    const o = makeOrder({ status: "created", reservedBuyer: true });
    expect(kinds(o, ctx(buyer))).toEqual(["fund"]);
    expect(kinds(o, ctx(stranger))).toEqual([]);
  });

  it("funded: vendor ships or refunds; buyer confirms or disputes", () => {
    const o = makeOrder();
    expect(kinds(o, ctx(vendor))).toEqual(["markShipped", "refund"]);
    expect(kinds(o, ctx(buyer))).toEqual(["confirmDelivery", "openDispute"]);
    expect(kinds(o, ctx(stranger))).toEqual([]);
  });

  it("funded past ship-by: vendor can no longer ship, buyer can reclaim", () => {
    const o = makeOrder();
    const late = o.shipBy! + 1;
    expect(kinds(o, ctx(vendor, late))).toEqual(["refund"]);
    expect(kinds(o, ctx(buyer, late))).toEqual([
      "confirmDelivery",
      "reclaimUnshipped",
      "openDispute",
    ]);
  });

  it("shipped: buyer can dispute until release_after, then anyone can release", () => {
    const o = makeOrder({ status: "shipped", shippedAt: 5_000, releaseAfter: 10_000 });
    expect(kinds(o, ctx(buyer, 9_999))).toEqual(["confirmDelivery", "openDispute"]);
    expect(kinds(o, ctx(buyer, 10_000))).toEqual(["confirmDelivery", "autoRelease"]);
    expect(kinds(o, ctx(stranger, 10_000))).toEqual(["autoRelease"]);
    const vendorActions = availableActions(o, ctx(vendor, 10_000));
    expect(vendorActions).toEqual([
      { kind: "refund", primary: false },
      { kind: "autoRelease", primary: true },
    ]);
  });

  it("disputed: only the arbiter rules; the vendor may concede", () => {
    const o = makeOrder({ status: "disputed" });
    expect(kinds(o, ctx(arbiter))).toEqual(["resolveDispute"]);
    expect(kinds(o, ctx(vendor))).toEqual(["refund"]);
    expect(kinds(o, ctx(buyer))).toEqual([]);
  });

  it("terminal states offer nothing", () => {
    for (const status of ["completed", "refunded", "resolved", "cancelled"] as const) {
      const o = makeOrder({ status });
      for (const w of [vendor, buyer, arbiter, stranger]) expect(kinds(o, ctx(w))).toEqual([]);
    }
  });
});

describe("activeDeadline", () => {
  it("reports the ship-by deadline while funded", () => {
    expect(activeDeadline(makeOrder(), 87_000)).toEqual({
      label: "Vendor must ship by",
      at: 87_500,
      remaining: 500,
    });
  });

  it("reports auto-release while shipped", () => {
    const o = makeOrder({ status: "shipped", releaseAfter: 10_000 });
    expect(activeDeadline(o, 12_000)?.remaining).toBe(-2_000);
  });

  it("is null otherwise", () => {
    expect(activeDeadline(makeOrder({ status: "completed" }), 0)).toBeNull();
  });
});

describe("timeline", () => {
  const states = (o: ReturnType<typeof makeOrder>) => timeline(o).map((s) => s.state);

  it("tracks progress through the happy path", () => {
    expect(states(makeOrder({ status: "created", fundedAt: null }))).toEqual([
      "done",
      "current",
      "upcoming",
      "upcoming",
    ]);
    expect(states(makeOrder())).toEqual(["done", "done", "current", "upcoming"]);
    expect(states(makeOrder({ status: "shipped", shippedAt: 2 }))).toEqual([
      "done",
      "done",
      "done",
      "current",
    ]);
    const done = timeline(makeOrder({ status: "completed", shippedAt: 2, settledAt: 3 }));
    expect(done.map((s) => s.state)).toEqual(["done", "done", "done", "done"]);
    expect(done[3]?.label).toBe("Released to vendor");
  });

  it("marks disputes as current and refunds as failed outcomes", () => {
    const d = timeline(makeOrder({ status: "disputed", shippedAt: 2 }));
    expect(d[3]).toMatchObject({ label: "In dispute", state: "current" });
    const r = timeline(makeOrder({ status: "refunded" }));
    expect(r[3]).toMatchObject({ label: "Refunded to buyer", state: "failed" });
  });

  it("labels every status", () => {
    expect(Object.keys(STATUS_LABEL)).toHaveLength(8);
  });
});
