import type { PublicKey } from "@solana/web3.js";

import type { OrderAccount, OrderStatus } from "./types.js";
import { TERMINAL_STATUSES } from "./types.js";

export type OrderRole = "vendor" | "buyer" | "arbiter" | "visitor";

export type OrderActionKind =
  | "fund"
  | "cancel"
  | "markShipped"
  | "confirmDelivery"
  | "openDispute"
  | "reclaimUnshipped"
  | "refund"
  | "autoRelease"
  | "resolveDispute";

export interface OrderAction {
  kind: OrderActionKind;
  /** Primary actions get the prominent button in the UI. */
  primary: boolean;
}

export interface ViewerContext {
  wallet: PublicKey | null;
  arbiter: PublicKey | null;
  nowSecs: number;
}

export function roleOf(
  order: OrderAccount,
  ctx: Pick<ViewerContext, "wallet" | "arbiter">,
): OrderRole {
  const { wallet, arbiter } = ctx;
  if (!wallet) return "visitor";
  if (wallet.equals(order.vendor)) return "vendor";
  if (order.buyer && wallet.equals(order.buyer) && order.status !== "created") return "buyer";
  if (arbiter && wallet.equals(arbiter)) return "arbiter";
  return "visitor";
}

/**
 * Mirrors the on-chain guards exactly, so the UI only ever offers transactions that will
 * succeed. The program remains the source of truth; this is a UX layer.
 */
export function availableActions(order: OrderAccount, ctx: ViewerContext): OrderAction[] {
  const role = roleOf(order, ctx);
  const now = ctx.nowSecs;
  const actions: OrderAction[] = [];
  const add = (kind: OrderActionKind, primary = false) => actions.push({ kind, primary });

  switch (order.status) {
    case "created": {
      if (role === "vendor") add("cancel");
      else if (ctx.wallet) {
        const allowed = !order.reservedBuyer || (order.buyer?.equals(ctx.wallet) ?? false);
        if (allowed) add("fund", true);
      }
      break;
    }
    case "funded": {
      const shipBy = order.shipBy ?? 0;
      if (role === "vendor") {
        if (now <= shipBy) add("markShipped", true);
        add("refund");
      } else if (role === "buyer") {
        add("confirmDelivery", true);
        if (now > shipBy) add("reclaimUnshipped", true);
        add("openDispute");
      }
      break;
    }
    case "shipped": {
      const releaseAfter = order.releaseAfter ?? 0;
      const due = now >= releaseAfter;
      if (role === "buyer") {
        add("confirmDelivery", true);
        if (!due) add("openDispute");
      }
      if (role === "vendor") add("refund");
      if (due && ctx.wallet) add("autoRelease", role === "vendor");
      break;
    }
    case "disputed": {
      if (role === "arbiter") add("resolveDispute", true);
      if (role === "vendor") add("refund");
      break;
    }
    default:
      break;
  }
  return actions;
}

export interface Deadline {
  label: string;
  at: number;
  /** Seconds remaining; negative once passed. */
  remaining: number;
}

/** The single deadline that matters most right now, if any. */
export function activeDeadline(order: OrderAccount, nowSecs: number): Deadline | null {
  if (order.status === "funded" && order.shipBy) {
    return { label: "Vendor must ship by", at: order.shipBy, remaining: order.shipBy - nowSecs };
  }
  if (order.status === "shipped" && order.releaseAfter) {
    return {
      label: "Auto-releases to vendor at",
      at: order.releaseAfter,
      remaining: order.releaseAfter - nowSecs,
    };
  }
  return null;
}

export interface TimelineStep {
  key: "created" | "funded" | "shipped" | "outcome";
  label: string;
  at: number | null;
  state: "done" | "current" | "upcoming" | "failed";
}

const OUTCOME_LABEL: Partial<Record<OrderStatus, string>> = {
  completed: "Released to vendor",
  refunded: "Refunded to buyer",
  resolved: "Resolved by arbiter",
  cancelled: "Cancelled",
  disputed: "In dispute",
};

export function timeline(order: OrderAccount): TimelineStep[] {
  const s = order.status;
  const reached = (k: "funded" | "shipped") => {
    if (k === "funded") return order.fundedAt !== null;
    return order.shippedAt !== null;
  };
  const terminal = TERMINAL_STATUSES.has(s);
  const outcomeState: TimelineStep["state"] =
    s === "completed" ? "done" : s === "disputed" ? "current" : terminal ? "failed" : "upcoming";

  return [
    { key: "created", label: "Order created", at: order.createdAt, state: "done" },
    {
      key: "funded",
      label: "Paid into escrow",
      at: order.fundedAt,
      state: reached("funded") ? "done" : s === "created" ? "current" : "upcoming",
    },
    {
      key: "shipped",
      label: "Shipped",
      at: order.shippedAt,
      state: reached("shipped") ? "done" : s === "funded" ? "current" : "upcoming",
    },
    {
      key: "outcome",
      label: OUTCOME_LABEL[s] ?? "Delivered & released",
      at: order.settledAt,
      state: s === "shipped" ? "current" : outcomeState,
    },
  ];
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  created: "Awaiting payment",
  funded: "Paid · awaiting shipment",
  shipped: "Shipped",
  disputed: "In dispute",
  completed: "Completed",
  refunded: "Refunded",
  resolved: "Resolved",
  cancelled: "Cancelled",
};
