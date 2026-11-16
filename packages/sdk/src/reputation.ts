import type { VendorProfileAccount } from "./types.js";

export type TrustTier = "new" | "trusted" | "good" | "caution" | "high-risk";

export interface TrustSignal {
  tone: "positive" | "negative" | "neutral";
  text: string;
}

export interface TrustScore {
  /** 0–100. New vendors start at 50 (no evidence either way). */
  score: number;
  tier: TrustTier;
  /** Orders that reached a final outcome and therefore count as evidence. */
  settledOrders: number;
  signals: TrustSignal[];
}

type ReputationInput = Pick<
  VendorProfileAccount,
  | "completed"
  | "refunded"
  | "missedShipments"
  | "disputesOpened"
  | "disputesWon"
  | "disputesLost"
  | "createdAt"
>;

/** Bayesian prior: behave as if every vendor starts with 2 good and 2 bad outcomes. */
const PRIOR_GOOD = 2;
const PRIOR_BAD = 2;
/** Taking payment and never shipping is the core scam, so it weighs double. */
const MISSED_SHIPMENT_WEIGHT = 2;
/** Below this many settled orders we label the vendor "new" whatever the ratio says. */
const MIN_EVIDENCE = 3;

const DAY = 86_400;

/**
 * Turns the raw on-chain counters into a score a buyer can read at a glance.
 * Deterministic and pure, so the same profile always produces the same verdict in every client.
 */
export function computeTrustScore(
  profile: ReputationInput,
  nowSecs = Math.floor(Date.now() / 1000),
): TrustScore {
  const good = profile.completed + profile.disputesWon;
  const bad = profile.disputesLost + MISSED_SHIPMENT_WEIGHT * profile.missedShipments;
  const settledOrders =
    profile.completed +
    profile.disputesWon +
    profile.disputesLost +
    profile.missedShipments +
    profile.refunded;

  const score = Math.round((100 * (good + PRIOR_GOOD)) / (good + bad + PRIOR_GOOD + PRIOR_BAD));

  let tier: TrustTier;
  if (settledOrders < MIN_EVIDENCE && bad === 0) tier = "new";
  else if (score >= 85) tier = "trusted";
  else if (score >= 70) tier = "good";
  else if (score >= 50) tier = "caution";
  else tier = "high-risk";

  const signals: TrustSignal[] = [];
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  if (profile.completed > 0) {
    signals.push({ tone: "positive", text: `${plural(profile.completed, "order")} delivered` });
  }
  if (profile.disputesWon > 0) {
    signals.push({ tone: "positive", text: `${plural(profile.disputesWon, "dispute")} won` });
  }
  if (profile.refunded > 0) {
    signals.push({ tone: "neutral", text: plural(profile.refunded, "voluntary refund") });
  }
  if (profile.disputesLost > 0) {
    signals.push({ tone: "negative", text: `${plural(profile.disputesLost, "dispute")} lost` });
  }
  if (profile.missedShipments > 0) {
    signals.push({
      tone: "negative",
      text: `Missed ${plural(profile.missedShipments, "shipping deadline")}`,
    });
  }
  const open = profile.disputesOpened - profile.disputesWon - profile.disputesLost;
  if (open > 0) {
    signals.push({ tone: "neutral", text: `${plural(open, "dispute")} awaiting a ruling` });
  }
  const ageDays = Math.max(0, Math.floor((nowSecs - profile.createdAt) / DAY));
  signals.push({
    tone: "neutral",
    text: ageDays === 0 ? "Joined today" : `Selling on TrustPay for ${plural(ageDays, "day")}`,
  });
  if (settledOrders === 0) {
    signals.unshift({ tone: "neutral", text: "No completed orders yet" });
  }

  return { score, tier, settledOrders, signals };
}

export const TIER_LABEL: Record<TrustTier, string> = {
  new: "New vendor",
  trusted: "Trusted",
  good: "Good standing",
  caution: "Use caution",
  "high-risk": "High risk",
};
