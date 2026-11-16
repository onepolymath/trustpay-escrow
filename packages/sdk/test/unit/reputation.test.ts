import { describe, expect, it } from "vitest";

import { TIER_LABEL, computeTrustScore } from "../../src/index.js";
import { makeProfile } from "./fixtures.js";

const DAY = 86_400;

describe("computeTrustScore", () => {
  it("starts new vendors at a neutral 50 and labels them new", () => {
    const s = computeTrustScore(makeProfile(), 0);
    expect(s).toMatchObject({ score: 50, tier: "new", settledOrders: 0 });
    expect(s.signals[0]?.text).toBe("No completed orders yet");
    expect(s.signals.at(-1)?.text).toBe("Joined today");
  });

  it("rewards a track record of deliveries", () => {
    const s = computeTrustScore(makeProfile({ completed: 10 }), 30 * DAY);
    expect(s.score).toBe(86);
    expect(s.tier).toBe("trusted");
    expect(s.signals.map((x) => x.text)).toContain("10 orders delivered");
    expect(s.signals.map((x) => x.text)).toContain("Selling on TrustPay for 30 days");
  });

  it("weighs missed shipments double: the core scam pattern", () => {
    const lost = computeTrustScore(makeProfile({ completed: 6, disputesLost: 2 }));
    const missed = computeTrustScore(makeProfile({ completed: 6, missedShipments: 2 }));
    expect(missed.score).toBeLessThan(lost.score);
    expect(missed.signals.find((x) => x.tone === "negative")?.text).toBe(
      "Missed 2 shipping deadlines",
    );
  });

  it("flags a vendor with any bad outcome even with little history", () => {
    const s = computeTrustScore(makeProfile({ missedShipments: 1 }));
    expect(s.tier).toBe("high-risk");
  });

  it("moves through every tier as evidence accumulates", () => {
    expect(computeTrustScore(makeProfile({ completed: 4 })).tier).toBe("good");
    expect(computeTrustScore(makeProfile({ completed: 3, disputesLost: 1 })).tier).toBe("caution");
    expect(computeTrustScore(makeProfile({ completed: 1, disputesLost: 3 })).tier).toBe(
      "high-risk",
    );
  });

  it("describes wins, refunds and pending disputes", () => {
    const s = computeTrustScore(
      makeProfile({
        completed: 1,
        disputesWon: 1,
        refunded: 1,
        disputesOpened: 3,
        disputesLost: 1,
      }),
      DAY,
    );
    const texts = s.signals.map((x) => x.text);
    expect(texts).toEqual(
      expect.arrayContaining([
        "1 order delivered",
        "1 dispute won",
        "1 voluntary refund",
        "1 dispute lost",
        "1 dispute awaiting a ruling",
        "Selling on TrustPay for 1 day",
      ]),
    );
  });

  it("is deterministic and bounded", () => {
    for (const p of [
      makeProfile({ completed: 1_000_000 }),
      makeProfile({ missedShipments: 1_000_000 }),
    ]) {
      const s = computeTrustScore(p);
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
      expect(computeTrustScore(p)).toEqual(s);
    }
  });

  it("has a label for every tier", () => {
    expect(Object.keys(TIER_LABEL).sort()).toEqual([
      "caution",
      "good",
      "high-risk",
      "new",
      "trusted",
    ]);
  });
});
