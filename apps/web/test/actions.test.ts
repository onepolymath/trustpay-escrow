import { Keypair } from "@solana/web3.js";
import type { OrderAccount, VendorProfileAccount } from "@trustpay/sdk";
import { describe, expect, it } from "vitest";

import { ACTION_HEADERS, DEVNET_BLOCKCHAIN_ID, buildActionMetadata } from "@/lib/actions";
import { parseOrderParams, parsePublicKey } from "@/lib/params";

const vendor = Keypair.generate().publicKey;

const order = (overrides: Partial<OrderAccount> = {}): OrderAccount => ({
  address: Keypair.generate().publicKey,
  vendor,
  buyer: null,
  reservedBuyer: false,
  mint: Keypair.generate().publicKey,
  orderId: 4n,
  amount: 25_500_000n,
  status: "created",
  shipWindowSecs: 60,
  confirmWindowSecs: 60,
  createdAt: 0,
  fundedAt: null,
  shipBy: null,
  shippedAt: null,
  releaseAfter: null,
  settledAt: null,
  buyerPayout: 0n,
  vendorPayout: 0n,
  title: "Ankara wrap dress",
  tracking: "",
  disputeReason: "",
  ...overrides,
});

const profile: VendorProfileAccount = {
  address: Keypair.generate().publicKey,
  vendor,
  handle: "@ummie.styles",
  ordersCreated: 12n,
  completed: 10,
  refunded: 0,
  missedShipments: 0,
  disputesOpened: 0,
  disputesWon: 0,
  disputesLost: 0,
  volumeSettled: 0n,
  createdAt: 0,
  lastActivityAt: 0,
};

const base = {
  origin: "https://trustpay.test",
  href: "/api/actions/order/x/4",
  symbol: "USDC",
  decimals: 6,
};

describe("buildActionMetadata", () => {
  it("offers a single pay button with price and vendor reputation", () => {
    const res = buildActionMetadata({ ...base, order: order(), profile });
    expect(res.title).toBe("Ankara wrap dress · 25.50 USDC");
    expect(res.description).toContain("@ummie.styles · Trusted (86/100, 10 delivered).");
    expect(res.links?.actions).toEqual([
      { type: "transaction", label: "Pay 25.50 USDC into escrow", href: base.href },
    ]);
    expect(res.icon).toBe("https://trustpay.test/api/og");
    expect(res.disabled).toBeUndefined();
  });

  it("disables the action once the order is paid", () => {
    const res = buildActionMetadata({ ...base, order: order({ status: "funded" }), profile: null });
    expect(res.disabled).toBe(true);
    expect(res.links).toBeUndefined();
    expect(res.error?.message).toMatch(/no longer open/);
  });

  it("explains missing orders", () => {
    const res = buildActionMetadata({ ...base, order: null, profile: null });
    expect(res).toMatchObject({ disabled: true, title: "Order not found" });
  });

  it("advertises devnet and the Actions version to Blink clients", () => {
    expect(ACTION_HEADERS["X-Blockchain-Ids"]).toBe(DEVNET_BLOCKCHAIN_ID);
    expect(ACTION_HEADERS["Access-Control-Allow-Origin"]).toBe("*");
  });
});

describe("route params", () => {
  it("accepts valid order links", () => {
    const parsed = parseOrderParams({ vendor: vendor.toBase58(), id: "42" });
    expect(parsed?.orderId).toBe(42n);
    expect(parsed?.vendor.equals(vendor)).toBe(true);
  });

  it.each([
    ["not-a-key", "1"],
    [vendor.toBase58(), "-1"],
    [vendor.toBase58(), "1.5"],
    [vendor.toBase58(), "18446744073709551616"],
  ])("rejects %s / %s", (v, id) => {
    expect(parseOrderParams({ vendor: v, id })).toBeNull();
  });

  it("parses public keys defensively", () => {
    expect(parsePublicKey("nope")).toBeNull();
  });
});
