"use client";

import type { OrderAccount, OrderActionKind } from "@trustpay/sdk";
import { availableActions, formatTokenAmount, roleOf } from "@trustpay/sdk";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Lock,
  Scale,
  Truck,
  Undo2,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { useNow } from "@/components/order/countdown";
import { ResolveDialog } from "@/components/order/resolve-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldHint, Input, Label, Textarea } from "@/components/ui/input";
import { ConnectDialog } from "@/components/wallet-button";
import { MAX_REASON_LEN, MAX_TRACKING_LEN } from "@trustpay/sdk";
import { PAYMENT_DECIMALS, PAYMENT_SYMBOL } from "@/lib/config";
import { useBalances, useProgramStatus } from "@/lib/data";
import { useSigner } from "@/lib/signer";
import { getClient } from "@/lib/solana";
import { useTransaction } from "@/lib/use-transaction";

const COPY: Record<OrderActionKind, { label: string; icon: typeof Lock; hint: string }> = {
  fund: {
    label: "Pay into escrow",
    icon: Lock,
    hint: "Your money is locked in a Solana program, not sent to the vendor.",
  },
  cancel: { label: "Cancel order", icon: Ban, hint: "Nobody has paid yet, so cancelling is free." },
  markShipped: {
    label: "Mark as shipped",
    icon: Truck,
    hint: "Starts the buyer's confirmation window.",
  },
  confirmDelivery: {
    label: "I received it, release funds",
    icon: CheckCircle2,
    hint: "Pays the vendor and adds a delivered order to their record.",
  },
  openDispute: {
    label: "Open a dispute",
    icon: AlertTriangle,
    hint: "Freezes the funds until an arbiter rules.",
  },
  reclaimUnshipped: {
    label: "Reclaim my money",
    icon: Undo2,
    hint: "The vendor missed the shipping deadline.",
  },
  refund: { label: "Refund buyer", icon: Undo2, hint: "Returns the full amount to the buyer." },
  autoRelease: {
    label: "Release to vendor",
    icon: Clock,
    hint: "The confirmation window has passed without a dispute.",
  },
  resolveDispute: {
    label: "Rule on dispute",
    icon: Scale,
    hint: "Split the escrow between buyer and vendor.",
  },
};

export function OrderActions({ order }: { order: OrderAccount }) {
  const { publicKey } = useSigner();
  const { data: status } = useProgramStatus();
  const { data: balances } = useBalances(publicKey);
  const { run, pending } = useTransaction();
  const now = useNow(5_000);
  const [connectOpen, setConnectOpen] = useState(false);
  const [dialog, setDialog] = useState<"ship" | "dispute" | null>(null);
  const [tracking, setTracking] = useState("");
  const [reason, setReason] = useState("");

  const arbiter = status?.config?.arbiter ?? null;
  const ctx = { wallet: publicKey, arbiter, nowSecs: now };
  const actions = availableActions(order, ctx);
  const role = roleOf(order, ctx);
  const client = getClient();

  if (!publicKey) {
    if (order.status !== "created") return null;
    return (
      <>
        <Button size="lg" className="w-full" onClick={() => setConnectOpen(true)}>
          <Wallet /> Connect wallet to pay
        </Button>
        <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
      </>
    );
  }

  if (actions.length === 0) {
    const message =
      order.status === "created" && order.reservedBuyer
        ? "This order is reserved for a specific buyer."
        : order.status === "disputed" && role !== "arbiter"
          ? "Waiting for the arbiter's ruling."
          : role === "visitor" && order.status !== "created"
            ? "You're viewing someone else's order."
            : null;
    return message ? (
      <p className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">{message}</p>
    ) : null;
  }

  const insufficient =
    role === "visitor" &&
    order.status === "created" &&
    balances !== undefined &&
    balances !== null &&
    balances.token < order.amount;

  async function execute(kind: OrderActionKind) {
    if (!publicKey) return;
    switch (kind) {
      case "fund":
        await run(
          "Paying into escrow",
          async () => [await client.fundOrder({ buyer: publicKey, order })],
          {
            success: "Paid. Your money is safe in escrow.",
          },
        );
        break;
      case "cancel":
        await run("Cancelling order", async () => [await client.cancelOrder(order)], {
          success: "Order cancelled",
        });
        break;
      case "confirmDelivery":
        await run("Releasing funds", async () => [await client.confirmDelivery(order)], {
          success: "Funds released to the vendor",
        });
        break;
      case "reclaimUnshipped":
        await run("Reclaiming funds", async () => [await client.reclaimUnshipped(order)], {
          success: "Refunded to your wallet",
        });
        break;
      case "refund":
        await run("Refunding buyer", async () => [await client.refundByVendor(order)], {
          success: "Buyer refunded",
        });
        break;
      case "autoRelease":
        await run(
          "Releasing funds",
          async () => [await client.autoRelease({ cranker: publicKey, order })],
          { success: "Funds released to the vendor" },
        );
        break;
      case "markShipped":
        setDialog("ship");
        break;
      case "openDispute":
        setDialog("dispute");
        break;
      case "resolveDispute":
        break;
    }
  }

  return (
    <div className="grid gap-2">
      {actions.map(({ kind, primary }) => {
        const { label, icon: Icon, hint } = COPY[kind];
        const button = (onClick: () => void) => (
          <Button
            key={kind}
            size={primary ? "lg" : "default"}
            variant={primary ? "default" : kind === "openDispute" ? "outline" : "secondary"}
            className="w-full"
            loading={pending !== null && primary}
            disabled={pending !== null || (kind === "fund" && insufficient)}
            onClick={onClick}
            title={hint}
          >
            <Icon />
            {kind === "fund"
              ? `Pay ${formatTokenAmount(order.amount, PAYMENT_DECIMALS)} ${PAYMENT_SYMBOL} into escrow`
              : label}
          </Button>
        );
        if (kind === "resolveDispute") {
          return <ResolveDialog key={kind} order={order} trigger={(open) => button(open)} />;
        }
        return button(() => void execute(kind));
      })}
      {insufficient && (
        <p className="text-center text-xs text-muted-foreground">
          Not enough {PAYMENT_SYMBOL} in this wallet. In demo mode use &ldquo;Top up test
          funds&rdquo; from the wallet menu.
        </p>
      )}
      {actions[0] && !insufficient && (
        <p className="text-center text-xs text-muted-foreground">{COPY[actions[0].kind].hint}</p>
      )}

      <Dialog open={dialog === "ship"} onOpenChange={(o) => setDialog(o ? "ship" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as shipped</DialogTitle>
            <DialogDescription>
              Add a tracking or waybill number so the buyer can follow the delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="tracking">Tracking number (optional)</Label>
            <Input
              id="tracking"
              placeholder="e.g. GIGL 4471-0098 or rider's phone"
              value={tracking}
              maxLength={MAX_TRACKING_LEN}
              onChange={(e) => setTracking(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              loading={pending !== null}
              onClick={() =>
                void run(
                  "Marking as shipped",
                  async () => [await client.markShipped(order, tracking.trim())],
                  { success: "Marked as shipped" },
                ).then((sig) => sig && setDialog(null))
              }
            >
              <Truck /> Confirm shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "dispute"} onOpenChange={(o) => setDialog(o ? "dispute" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a dispute</DialogTitle>
            <DialogDescription>
              The funds freeze immediately. An independent arbiter reviews and decides who gets
              paid.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="reason">What went wrong?</Label>
            <Textarea
              id="reason"
              placeholder="e.g. Item never arrived, or it's not what was pictured"
              value={reason}
              maxLength={MAX_REASON_LEN}
              onChange={(e) => setReason(e.target.value)}
            />
            <FieldHint className="tabular text-right">
              {reason.length}/{MAX_REASON_LEN}
            </FieldHint>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length === 0}
              loading={pending !== null}
              onClick={() =>
                void run(
                  "Opening dispute",
                  async () => [await client.openDispute(order, reason.trim())],
                  { success: "Dispute opened. Funds are frozen." },
                ).then((sig) => sig && setDialog(null))
              }
            >
              <AlertTriangle /> Freeze funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
