"use client";

import { ShoppingBag, Wallet } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { OrderListSkeleton, OrderRow } from "@/components/order/order-row";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConnectDialog } from "@/components/wallet-button";
import { useOrders } from "@/lib/data";
import { useSigner } from "@/lib/signer";

export function Purchases() {
  const { publicKey, mode } = useSigner();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useOrders({ buyer: publicKey }, !!publicKey);
  const active = (data ?? []).filter((o) => ["funded", "shipped", "disputed"].includes(o.status));
  const past = (data ?? []).filter((o) => !["funded", "shipped", "disputed"].includes(o.status));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        title="My purchases"
        description="Everything you've paid for through TrustPay, and where your money is right now."
      />
      {!publicKey ? (
        <>
          <EmptyState
            icon={Wallet}
            title="Connect a wallet to see your purchases"
            action={<Button onClick={() => setOpen(true)}>Connect</Button>}
          />
          <ConnectDialog open={open} onOpenChange={setOpen} />
        </>
      ) : isLoading ? (
        <Card>
          <OrderListSkeleton />
        </Card>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No purchases yet"
          description={
            mode.kind === "demo" && mode.role === "buyer"
              ? "Open an order link from your demo vendor to pay for it."
              : "When a vendor sends you a TrustPay link and you pay, it shows up here."
          }
        />
      ) : (
        <div className="grid gap-8">
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">In progress</h2>
              <Card className="divide-y divide-border overflow-hidden">
                {active.map((o) => (
                  <OrderRow key={o.address.toBase58()} order={o} />
                ))}
              </Card>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Completed</h2>
              <Card className="divide-y divide-border overflow-hidden">
                {past.map((o) => (
                  <OrderRow key={o.address.toBase58()} order={o} />
                ))}
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
