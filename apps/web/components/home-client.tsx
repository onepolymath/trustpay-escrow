"use client";

import { FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConnectDialog } from "@/components/wallet-button";
import { DEMO_ENABLED } from "@/lib/config";
import { useProgramStatus } from "@/lib/data";
import { useSigner } from "@/lib/signer";

export function HeroDemoButton() {
  const { publicKey } = useSigner();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState(false);
  useEffect(() => {
    if (pendingNav && publicKey) router.push("/sell");
  }, [pendingNav, publicKey, router]);
  return (
    <>
      <Button
        size="lg"
        onClick={() => {
          setPendingNav(true);
          if (!publicKey) setOpen(true);
        }}
      >
        <FlaskConical />
        {DEMO_ENABLED ? "Try the live demo" : "Get started"}
      </Button>
      <ConnectDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function LiveStats() {
  const { data } = useProgramStatus();
  const orders = data?.config?.orderCount;
  return (
    <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
      <div>
        <dt className="text-xs text-muted-foreground">Orders on chain</dt>
        <dd className="tabular mt-1 text-xl font-semibold">
          {orders === undefined ? "—" : orders.toString()}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Custody</dt>
        <dd className="mt-1 text-xl font-semibold">Program</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Network</dt>
        <dd className="mt-1 text-xl font-semibold">Solana</dd>
      </div>
    </dl>
  );
}
