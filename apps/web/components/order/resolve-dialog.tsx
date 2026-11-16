"use client";

import type { OrderAccount } from "@trustpay/sdk";
import { formatTokenAmount } from "@trustpay/sdk";
import { Scale } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEMO_ENABLED, PAYMENT_DECIMALS, PAYMENT_SYMBOL } from "@/lib/config";
import { useProgramStatus, useRefreshAll } from "@/lib/data";
import { useSigner } from "@/lib/signer";
import { getClient } from "@/lib/solana";
import { useTransaction } from "@/lib/use-transaction";

const PRESETS = [
  { label: "Full refund", bps: 10_000 },
  { label: "70 / 30", bps: 7_000 },
  { label: "50 / 50", bps: 5_000 },
  { label: "Pay vendor", bps: 0 },
];

export function ResolveDialog({
  order,
  trigger,
}: {
  order: OrderAccount;
  trigger: (open: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [bps, setBps] = useState(10_000);
  const [busy, setBusy] = useState(false);
  const { publicKey } = useSigner();
  const { data: status } = useProgramStatus();
  const { run } = useTransaction();
  const refresh = useRefreshAll();

  const arbiter = status?.config?.arbiter ?? null;
  const isArbiter = !!publicKey && !!arbiter && publicKey.equals(arbiter);
  const toBuyer = (order.amount * BigInt(bps)) / 10_000n;
  const toVendor = order.amount - toBuyer;
  const fmt = (v: bigint) => `${formatTokenAmount(v, PAYMENT_DECIMALS)} ${PAYMENT_SYMBOL}`;

  async function submit() {
    if (publicKey && isArbiter) {
      const sig = await run(
        "Issuing ruling",
        async () => [
          await getClient().resolveDispute({ arbiter: publicKey, order, buyerBps: bps }),
        ],
        { success: "Ruling recorded on chain" },
      );
      if (sig) setOpen(false);
      return;
    }
    setBusy(true);
    const id = toast.loading("Demo arbiter is signing the ruling…");
    try {
      const res = await fetch("/api/demo/arbiter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order: order.address.toBase58(), buyerBps: bps }),
      });
      const body = (await res.json()) as { signature?: string; error?: string };
      if (!res.ok || !body.signature) throw new Error(body.error ?? "Arbiter unavailable");
      toast.success("Ruling recorded on chain", { id });
      await refresh();
      setOpen(false);
    } catch (e) {
      toast.error("Ruling failed", { id, description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const canRule = isArbiter || DEMO_ENABLED;

  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="size-5 text-primary" /> Rule on this dispute
            </DialogTitle>
            <DialogDescription>
              Funds can only go to this order&apos;s buyer and vendor. The program enforces it.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-muted/60 p-4 text-sm">
            <p className="font-medium">Buyer says</p>
            <p className="mt-1 text-muted-foreground">&ldquo;{order.disputeReason}&rdquo;</p>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {PRESETS.map((p) => (
              <Button
                key={p.bps}
                size="sm"
                variant={bps === p.bps ? "default" : "outline"}
                onClick={() => setBps(p.bps)}
                className="px-1 text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div>
            <input
              type="range"
              min={0}
              max={10_000}
              step={500}
              value={bps}
              onChange={(e) => setBps(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
              aria-label="Share refunded to buyer"
            />
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Buyer receives</p>
                <p className="tabular mt-0.5 font-semibold">{fmt(toBuyer)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Vendor receives</p>
                <p className="tabular mt-0.5 font-semibold">{fmt(toVendor)}</p>
              </div>
            </div>
          </div>

          {!isArbiter && DEMO_ENABLED && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              Demo arbiter: a TrustPay server key signs this ruling so you can try the full flow. In
              production the arbiter is a Squads multisig.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} loading={busy} disabled={!canRule}>
              Issue ruling
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
