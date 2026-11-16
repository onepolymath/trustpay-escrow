import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { beforeEach, describe, expect, it } from "vitest";

import { computeTrustScore, findVaultAddress } from "../../src/index.js";
import { Harness, usd } from "./harness.js";

let h: Harness;

beforeEach(() => {
  h = new Harness();
});

describe("config", () => {
  it("only the upgrade authority can initialise, and only once", async () => {
    const notAdmin = h.client.initializeConfig({
      admin: h.stranger.publicKey,
      arbiter: h.stranger.publicKey,
      minWindowSecs: 60,
      maxWindowSecs: 3_600,
    });
    expect(await h.expectError(notAdmin, [h.stranger])).toBe("NotUpgradeAuthority");

    await h.initConfig();
    const cfg = await h.client.fetchConfig();
    expect(cfg?.arbiter.equals(h.arbiter.publicKey)).toBe(true);
    expect(cfg?.orderCount).toBe(0n);

    const again = h.client.initializeConfig({
      admin: h.admin.publicKey,
      arbiter: h.admin.publicKey,
      minWindowSecs: 60,
      maxWindowSecs: 3_600,
    });
    await expect(h.send(again, h.admin)).rejects.toThrow(/already in use/);
  });

  it("rejects invalid window bounds", async () => {
    const bad = h.client.initializeConfig({
      admin: h.admin.publicKey,
      arbiter: h.arbiter.publicKey,
      minWindowSecs: 3_600,
      maxWindowSecs: 60,
    });
    expect(await h.expectError(bad, [h.admin])).toBe("InvalidWindowBounds");
  });

  it("lets only the admin rotate the arbiter and tune bounds", async () => {
    await h.initConfig();
    const newArbiter = Keypair.generate().publicKey;
    const hijack = h.client.updateConfig({
      admin: h.stranger.publicKey,
      newArbiter: h.stranger.publicKey,
    });
    expect(await h.expectError(hijack, [h.stranger])).toBe("ConstraintHasOne");

    await h.send(
      h.client.updateConfig({
        admin: h.admin.publicKey,
        newArbiter,
        windowBounds: { minSecs: 120, maxSecs: 7_200 },
      }),
      h.admin,
    );
    const cfg = await h.client.fetchConfig();
    expect(cfg?.arbiter.equals(newArbiter)).toBe(true);
    expect([cfg?.minWindowSecs, cfg?.maxWindowSecs]).toEqual([120, 7_200]);

    const bad = h.client.updateConfig({
      admin: h.admin.publicKey,
      windowBounds: { minSecs: 1, maxSecs: 2 },
    });
    expect(await h.expectError(bad, [h.admin])).toBe("InvalidWindowBounds");
  });
});

describe("vendor registration", () => {
  it("creates an empty reputation record", async () => {
    await h.registerVendor("@ummie.styles");
    const p = await h.vendorProfile();
    expect(p.handle).toBe("@ummie.styles");
    expect([p.completed, p.disputesLost, p.missedShipments]).toEqual([0, 0, 0]);
    expect(computeTrustScore(p, p.createdAt).tier).toBe("new");
  });

  it("rejects blank handles and double registration", async () => {
    expect(
      await h.expectError(
        h.client.program.methods
          .registerVendor("   ")
          .accountsStrict({
            vendor: h.vendor.publicKey,
            vendorProfile: h.client.vendorAddress(h.vendor.publicKey),
            systemProgram: PublicKey.default,
          })
          .instruction(),
        [h.vendor],
      ),
    ).toBe("EmptyText");
    await h.registerVendor();
    await expect(h.registerVendor("@again")).rejects.toThrow(/already in use/);
  });
});

describe("order creation", () => {
  beforeEach(async () => {
    await h.initConfig(60, 7 * 86_400);
    await h.registerVendor();
  });

  const create = (overrides: Partial<Parameters<Harness["client"]["createOrder"]>[0]> = {}) =>
    h.client.createOrder({
      vendor: h.vendor.publicKey,
      mint: h.mint,
      orderId: 0n,
      amount: usd(10),
      title: "Shea butter x3",
      shipWindowSecs: 86_400,
      confirmWindowSecs: 86_400,
      ...overrides,
    });

  it("enforces sequential ids so order links are predictable", async () => {
    expect(await h.expectError(create({ orderId: 5n }), [h.vendor])).toBe("UnexpectedOrderId");
    await h.send(create(), h.vendor);
    await h.send(create({ orderId: 1n }), h.vendor);
    expect((await h.vendorProfile()).ordersCreated).toBe(2n);
    expect((await h.client.fetchConfig())?.orderCount).toBe(2n);
  });

  it("validates windows against config bounds", async () => {
    expect(await h.expectError(create({ shipWindowSecs: 30 }), [h.vendor])).toBe(
      "WindowOutOfBounds",
    );
    expect(await h.expectError(create({ confirmWindowSecs: 8 * 86_400 }), [h.vendor])).toBe(
      "WindowOutOfBounds",
    );
  });

  it("rejects reserving an order for the vendor's own wallet", async () => {
    expect(await h.expectError(create({ buyer: h.vendor.publicKey }), [h.vendor])).toBe(
      "SelfDealing",
    );
  });

  it("requires a registered vendor", async () => {
    const ix = h.client.createOrder({
      vendor: h.stranger.publicKey,
      mint: h.mint,
      orderId: 0n,
      amount: usd(1),
      title: "x",
      shipWindowSecs: 86_400,
      confirmWindowSecs: 86_400,
    });
    expect(await h.expectError(ix, [h.stranger])).toBe("AccountNotInitialized");
  });

  it("lets the vendor cancel an unpaid order, and nobody else", async () => {
    await h.send(create(), h.vendor);
    const order = await h.order(h.client.orderAddress(h.vendor.publicKey, 0n));
    const byStranger = h.client.program.methods
      .cancelOrder()
      .accountsStrict({ vendor: h.stranger.publicKey, order: order.address })
      .instruction();
    expect(await h.expectError(byStranger, [h.stranger])).toBe("ConstraintSeeds");

    await h.send(h.client.cancelOrder(order), h.vendor);
    expect((await h.order(order.address)).status).toBe("cancelled");
    expect(await h.expectError(h.client.cancelOrder(order), [h.vendor])).toBe("InvalidStatus");
  });
});

describe("happy path: pay → ship → confirm", () => {
  it("escrows funds, releases them to the vendor and builds reputation", async () => {
    const address = await h.setupOrder({ amount: usd(25) });
    h.setTokenBalance(h.buyer.publicKey, usd(100));

    await h.fund(address);
    let o = await h.order(address);
    expect(o.status).toBe("funded");
    expect(o.buyer?.equals(h.buyer.publicKey)).toBe(true);
    expect(o.shipBy).toBe(o.fundedAt! + 3 * 86_400);
    expect(h.tokenBalance(h.buyer.publicKey)).toBe(usd(75));
    expect(h.tokenBalance(address)).toBe(usd(25));

    await h.ship(address, "GIGL-12345");
    o = await h.order(address);
    expect(o.status).toBe("shipped");
    expect(o.tracking).toBe("GIGL-12345");
    expect(o.releaseAfter).toBe(o.shippedAt! + 5 * 86_400);

    const buyerLamportsBefore = h.lamports(h.buyer.publicKey);
    await h.send(h.client.confirmDelivery(o), h.buyer);
    o = await h.order(address);
    expect(o.status).toBe("completed");
    expect(o.vendorPayout).toBe(usd(25));
    expect(h.tokenBalance(h.vendor.publicKey)).toBe(usd(25));
    expect(h.accountExists(findVaultAddress(address, h.mint))).toBe(false);
    // Vault rent comes back to the buyer (who paid it), net of the tx fee + vendor ATA rent.
    expect(h.lamports(h.buyer.publicKey)).toBeGreaterThan(buyerLamportsBefore - 2_100_000n);

    const p = await h.vendorProfile();
    expect(p.completed).toBe(1);
    expect(p.volumeSettled).toBe(usd(25));
  });

  it("lets the buyer confirm early, before shipment", async () => {
    const address = await h.setupOrder();
    await h.fund(address);
    await h.send(h.client.confirmDelivery(await h.order(address)), h.buyer);
    expect((await h.order(address)).status).toBe("completed");
  });
});

describe("funding guards", () => {
  it("blocks a vendor from funding their own order (wash-trading reputation)", async () => {
    const address = await h.setupOrder();
    h.setTokenBalance(h.vendor.publicKey, usd(100));
    const ix = h.client.fundOrder({ buyer: h.vendor.publicKey, order: await h.order(address) });
    expect(await h.expectError(ix, [h.vendor])).toBe("SelfDealing");
  });

  it("enforces reserved buyers", async () => {
    const address = await h.setupOrder({ buyer: h.buyer.publicKey });
    h.setTokenBalance(h.stranger.publicKey, usd(100));
    const ix = h.client.fundOrder({ buyer: h.stranger.publicKey, order: await h.order(address) });
    expect(await h.expectError(ix, [h.stranger])).toBe("NotReservedBuyer");
    await h.fund(address, h.buyer);
    expect((await h.order(address)).status).toBe("funded");
  });

  it("cannot be funded twice or after cancellation", async () => {
    const address = await h.setupOrder();
    await h.fund(address);
    h.setTokenBalance(h.stranger.publicKey, usd(100));
    const again = h.client.fundOrder({
      buyer: h.stranger.publicKey,
      order: await h.order(address),
    });
    expect(await h.expectError(again, [h.stranger])).toBe("InvalidStatus");

    const second = await h.setupOrder();
    await h.send(h.client.cancelOrder(await h.order(second)), h.vendor);
    const late = h.client.fundOrder({ buyer: h.stranger.publicKey, order: await h.order(second) });
    expect(await h.expectError(late, [h.stranger])).toBe("InvalidStatus");
  });

  it("is not blocked by a griefer pre-creating the vault ATA", async () => {
    const address = await h.setupOrder();
    h.setTokenBalance(address, 0n); // attacker creates the order PDA's ATA first
    await h.fund(address);
    expect(h.tokenBalance(address)).toBe(usd(25));
  });

  it("fails cleanly when the buyer cannot cover the amount", async () => {
    const address = await h.setupOrder({ amount: usd(50) });
    h.setTokenBalance(h.buyer.publicKey, usd(10));
    const ix = h.client.fundOrder({ buyer: h.buyer.publicKey, order: await h.order(address) });
    await expect(h.send(ix, h.buyer)).rejects.toThrow(/insufficient funds/i);
  });
});

describe("pay-first-no-delivery protection", () => {
  it("vendor cannot mark shipped after the deadline; buyer reclaims and vendor is penalised", async () => {
    const address = await h.setupOrder({ ship: 86_400 });
    await h.fund(address);
    const o = await h.order(address);

    expect(await h.expectError(h.client.reclaimUnshipped(o), [h.buyer])).toBe(
      "ShipDeadlineNotReached",
    );

    h.setTime(o.shipBy! + 1);
    expect(await h.expectError(h.client.markShipped(o, "late"), [h.vendor])).toBe(
      "ShipDeadlinePassed",
    );

    await h.send(h.client.reclaimUnshipped(o), h.buyer);
    const after = await h.order(address);
    expect(after.status).toBe("refunded");
    expect(after.buyerPayout).toBe(usd(25));
    expect(h.tokenBalance(h.buyer.publicKey)).toBe(usd(1_000));
    expect((await h.vendorProfile()).missedShipments).toBe(1);
  });

  it("only the vendor can mark an order shipped", async () => {
    const address = await h.setupOrder();
    await h.fund(address);
    const ix = h.client.program.methods
      .markShipped("fake")
      .accountsStrict({ vendor: h.buyer.publicKey, order: address })
      .instruction();
    expect(await h.expectError(ix, [h.buyer])).toBe("ConstraintSeeds");
  });
});

describe("automatic release and the timeout race", () => {
  it("anyone can release after the confirm window; not one second before", async () => {
    const address = await h.setupOrder({ confirm: 3_600 });
    await h.fund(address);
    await h.ship(address);
    const o = await h.order(address);

    h.setTime(o.releaseAfter! - 1);
    const early = h.client.autoRelease({ cranker: h.stranger.publicKey, order: o });
    expect(await h.expectError(early, [h.stranger])).toBe("ReleaseNotYetDue");

    h.setTime(o.releaseAfter!);
    await h.send(h.client.autoRelease({ cranker: h.stranger.publicKey, order: o }), h.stranger);
    expect((await h.order(address)).status).toBe("completed");
    expect(h.tokenBalance(h.vendor.publicKey)).toBe(usd(25));
    expect((await h.vendorProfile()).completed).toBe(1);
  });

  it("dispute is allowed until release_after and rejected from that instant", async () => {
    const a = await h.setupOrder({ confirm: 3_600 });
    await h.fund(a);
    await h.ship(a);
    const o = await h.order(a);

    h.setTime(o.releaseAfter!);
    expect(await h.expectError(h.client.openDispute(o, "too late"), [h.buyer])).toBe(
      "DisputeWindowClosed",
    );

    const b = await h.setupOrder({ confirm: 3_600 });
    await h.fund(b);
    await h.ship(b);
    const ob = await h.order(b);
    h.setTime(ob.releaseAfter! - 1);
    await h.dispute(b);
    const disputed = await h.order(b);
    expect(disputed.status).toBe("disputed");
    // Once disputed, the timeout can no longer release funds to the vendor.
    h.setTime(ob.releaseAfter! + 10);
    const crank = h.client.autoRelease({ cranker: h.stranger.publicKey, order: disputed });
    expect(await h.expectError(crank, [h.stranger])).toBe("InvalidStatus");
  });

  it("auto release is refused before shipment", async () => {
    const address = await h.setupOrder();
    await h.fund(address);
    const ix = h.client.autoRelease({
      cranker: h.stranger.publicKey,
      order: await h.order(address),
    });
    expect(await h.expectError(ix, [h.stranger])).toBe("InvalidStatus");
  });
});

describe("disputes and arbitration", () => {
  async function disputed(): Promise<PublicKey> {
    const address = await h.setupOrder({ amount: usd(40) });
    await h.fund(address);
    await h.ship(address);
    await h.dispute(address, "Received a different fabric than pictured");
    return address;
  }

  it("records the reason and counts against the vendor", async () => {
    const address = await disputed();
    const o = await h.order(address);
    expect(o.disputeReason).toBe("Received a different fabric than pictured");
    expect((await h.vendorProfile()).disputesOpened).toBe(1);
  });

  it("only the configured arbiter can rule", async () => {
    const o = await h.order(await disputed());
    for (const impostor of [h.buyer, h.vendor, h.stranger]) {
      const ix = h.client.resolveDispute({
        arbiter: impostor.publicKey,
        order: o,
        buyerBps: 10_000,
      });
      expect(await h.expectError(ix, [impostor])).toBe("ConstraintHasOne");
    }
  });

  it("splits funds exactly and marks a majority refund as a lost dispute", async () => {
    const o = await h.order(await disputed());
    await h.send(
      h.client.resolveDispute({ arbiter: h.arbiter.publicKey, order: o, buyerBps: 7_000 }),
      h.arbiter,
    );
    const after = await h.order(o.address);
    expect(after.status).toBe("resolved");
    expect([after.buyerPayout, after.vendorPayout]).toEqual([usd(28), usd(12)]);
    expect(h.tokenBalance(h.buyer.publicKey)).toBe(usd(1_000 - 40 + 28));
    expect(h.tokenBalance(h.vendor.publicKey)).toBe(usd(12));
    const p = await h.vendorProfile();
    expect([p.disputesLost, p.disputesWon]).toEqual([1, 0]);
    expect(p.volumeSettled).toBe(usd(12));
  });

  it("a ruling for the vendor counts as a won dispute", async () => {
    const o = await h.order(await disputed());
    await h.send(
      h.client.resolveDispute({ arbiter: h.arbiter.publicKey, order: o, buyerBps: 0 }),
      h.arbiter,
    );
    const p = await h.vendorProfile();
    expect([p.disputesLost, p.disputesWon]).toEqual([0, 1]);
    expect(h.tokenBalance(h.vendor.publicKey)).toBe(usd(40));
  });

  it("rejects splits above 100%", async () => {
    const o = await h.order(await disputed());
    const ix = await h.client.resolveDispute({
      arbiter: h.arbiter.publicKey,
      order: o,
      buyerBps: 0,
    });
    // Bypass the SDK's client-side check by patching the u16 argument after the discriminator.
    ix.data.writeUInt16LE(10_001, 8);
    expect(await h.expectError(ix, [h.arbiter])).toBe("InvalidBps");
  });

  it("arbiter cannot redirect funds to their own token account", async () => {
    const o = await h.order(await disputed());
    const ix = await h.client.resolveDispute({
      arbiter: h.arbiter.publicKey,
      order: o,
      buyerBps: 10_000,
    });
    const arbiterAta = h.setTokenBalance(h.arbiter.publicKey, 0n);
    const buyerAta = getAssociatedTokenAddressSync(h.mint, h.buyer.publicKey);
    for (const k of ix.keys) if (k.pubkey.equals(buyerAta)) k.pubkey = arbiterAta;
    expect(await h.expectError(ix, [h.arbiter])).toMatch(
      /ConstraintAssociated|ConstraintTokenOwner/,
    );
    expect(h.tokenBalance(h.arbiter.publicKey)).toBe(0n);
  });

  it("an arbiter who is also a party cannot rule (conflict of interest)", async () => {
    const o = await h.order(await disputed());
    await h.send(
      h.client.updateConfig({ admin: h.admin.publicKey, newArbiter: h.buyer.publicKey }),
      h.admin,
    );
    const ix = h.client.resolveDispute({ arbiter: h.buyer.publicKey, order: o, buyerBps: 10_000 });
    expect(await h.expectError(ix, [h.buyer])).toBe("ArbiterConflict");
  });

  it("vendor can concede a dispute with a full refund", async () => {
    const o = await h.order(await disputed());
    await h.send(h.client.refundByVendor(o), h.vendor);
    const after = await h.order(o.address);
    expect(after.status).toBe("refunded");
    expect(h.tokenBalance(h.buyer.publicKey)).toBe(usd(1_000));
    expect((await h.vendorProfile()).refunded).toBe(1);
  });

  it("the buyer cannot dispute twice or after settlement", async () => {
    const o = await h.order(await disputed());
    expect(await h.expectError(h.client.openDispute(o, "again"), [h.buyer])).toBe("InvalidStatus");
  });
});

describe("double-spend and replay protection", () => {
  it("funds can be released exactly once", async () => {
    const address = await h.setupOrder();
    await h.fund(address);
    const o = await h.order(address);
    await h.send(h.client.confirmDelivery(o), h.buyer);
    // Every settlement path is rejected afterwards (the vault is closed and status is terminal).
    await expect(h.send(h.client.confirmDelivery(o), h.buyer)).rejects.toThrow();
    await expect(h.send(h.client.refundByVendor(o), h.vendor)).rejects.toThrow();
    await expect(
      h.send(
        h.client.resolveDispute({ arbiter: h.arbiter.publicKey, order: o, buyerBps: 10_000 }),
        h.arbiter,
      ),
    ).rejects.toThrow();
    expect(h.tokenBalance(h.vendor.publicKey)).toBe(usd(25));
  });

  it("a stranger cannot confirm or reclaim on the buyer's behalf", async () => {
    const address = await h.setupOrder();
    await h.fund(address);
    const o = await h.order(address);
    const fake = { ...o, buyer: h.stranger.publicKey };
    expect(await h.expectError(h.client.confirmDelivery(fake), [h.stranger])).toBe(
      "ConstraintHasOne",
    );
    expect(await h.expectError(h.client.reclaimUnshipped(fake), [h.stranger])).toBe(
      "ConstraintHasOne",
    );
  });

  it("stray tokens sent to the vault are swept, so the vault can always close", async () => {
    const address = await h.setupOrder({ amount: usd(25) });
    await h.fund(address);
    h.setTokenBalance(address, usd(25) + 7n); // someone "donates" 7 base units
    await h.send(h.client.confirmDelivery(await h.order(address)), h.buyer);
    expect(h.tokenBalance(h.vendor.publicKey)).toBe(usd(25) + 7n);
    expect(h.accountExists(findVaultAddress(address, h.mint))).toBe(false);
  });
});

describe("SDK read path", () => {
  it("lists orders by vendor, buyer and status straight from program accounts", async () => {
    const a = await h.setupOrder();
    const b = await h.setupOrder();
    await h.setupOrder();
    await h.fund(a);
    await h.fund(b);
    await h.ship(b);

    const byVendor = await h.client.listOrders({ vendor: h.vendor.publicKey });
    expect(byVendor).toHaveLength(3);
    const byBuyer = await h.client.listOrders({ buyer: h.buyer.publicKey });
    expect(byBuyer.map((o) => o.address.toBase58()).sort()).toEqual(
      [a, b].map((x) => x.toBase58()).sort(),
    );
    const shipped = await h.client.listOrders({ vendor: h.vendor.publicKey, status: "shipped" });
    expect(shipped.map((o) => o.address.toBase58())).toEqual([b.toBase58()]);

    const vendors = await h.client.listVendors();
    expect(vendors.map((v) => v.handle)).toEqual(["@ummie.styles"]);
    expect(await h.client.fetchOrder(Keypair.generate().publicKey)).toBeNull();
  });

  it("builds a signed-ready transaction with a recent blockhash", async () => {
    await h.initConfig();
    const ix = await h.client.registerVendor({ vendor: h.vendor.publicKey, handle: "@shop" });
    const tx = await h.client.buildTransaction([ix], h.vendor.publicKey);
    expect(tx.recentBlockhash).toBe(h.svm.latestBlockhash());
    expect(tx.feePayer?.equals(h.vendor.publicKey)).toBe(true);
  });

  it("reputation reflects a vendor's on-chain history end to end", async () => {
    for (let i = 0; i < 4; i++) {
      const a = await h.setupOrder();
      await h.fund(a);
      await h.send(h.client.confirmDelivery(await h.order(a)), h.buyer);
    }
    const score = computeTrustScore(await h.vendorProfile(), h.now());
    expect(score.settledOrders).toBe(4);
    expect(score.score).toBe(75);
    expect(score.tier).toBe("good");
  });
});
