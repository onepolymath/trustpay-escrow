import type { OrderAccount, VendorProfileAccount } from "@trustpay/sdk";
import { TIER_LABEL, computeTrustScore, formatTokenAmount } from "@trustpay/sdk";

/** Solana Actions spec v2 response shapes (subset we use). */
export interface ActionGetResponse {
  type: "action";
  icon: string;
  title: string;
  description: string;
  label: string;
  disabled?: boolean;
  error?: { message: string };
  links?: { actions: { type: "transaction"; label: string; href: string }[] };
}

export const DEVNET_BLOCKCHAIN_ID = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

export const ACTION_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "X-Action-Version": "2.4",
  "X-Blockchain-Ids": DEVNET_BLOCKCHAIN_ID,
  "Content-Type": "application/json",
};

export function buildActionMetadata(params: {
  order: OrderAccount | null;
  profile: VendorProfileAccount | null;
  origin: string;
  href: string;
  symbol: string;
  decimals: number;
}): ActionGetResponse {
  const { order, profile, origin, href, symbol, decimals } = params;
  const icon = `${origin}/api/og`;
  if (!order) {
    return {
      type: "action",
      icon,
      title: "Order not found",
      description: "This TrustPay link doesn't match an order on devnet.",
      label: "Unavailable",
      disabled: true,
      error: { message: "Order not found" },
    };
  }
  const price = `${formatTokenAmount(order.amount, decimals)} ${symbol}`;
  const trust = profile ? computeTrustScore(profile) : null;
  const vendorLine =
    profile && trust
      ? `${profile.handle} · ${TIER_LABEL[trust.tier]} (${trust.score}/100, ${profile.completed} delivered).`
      : "";
  const payable = order.status === "created";
  return {
    type: "action",
    icon,
    title: `${order.title} · ${price}`,
    description:
      `${vendorLine} Your payment is held in a Solana escrow until you confirm delivery. If the vendor doesn't ship in time, you get it back.`.trim(),
    label: payable ? `Pay ${price}` : "Already paid",
    ...(payable
      ? {
          links: {
            actions: [{ type: "transaction" as const, label: `Pay ${price} into escrow`, href }],
          },
        }
      : { disabled: true, error: { message: "This order is no longer open for payment." } }),
  };
}
