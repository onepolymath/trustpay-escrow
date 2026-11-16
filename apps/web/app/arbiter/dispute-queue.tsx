"use client";

import { orderPath } from "@trustpay/sdk";
import { Gavel, Scale } from "lucide-react";
import Link from "next/link";

import { Address } from "@/components/address";
import { Amount } from "@/components/amount";
import { EmptyState } from "@/components/empty-state";
import { ResolveDialog } from "@/components/order/resolve-dialog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_ENABLED } from "@/lib/config";
import { useOrders, useProgramStatus } from "@/lib/data";
import { relativeTime } from "@/lib/utils";

export function DisputeQueue() {
  const { data, isLoading } = useOrders({ status: "disputed" });
  const { data: status } = useProgramStatus();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <PageHeader
        title="Dispute queue"
        description="Disputed orders waiting for a ruling. Every ruling is a transaction that can only pay this order's buyer or vendor."
      />
      {status?.config && (
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-border px-4 py-3 text-sm">
          <Scale className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">Arbiter key</span>
          <Address value={status.config.arbiter} />
          {DEMO_ENABLED && (
            <span className="text-xs text-muted-foreground sm:ml-auto">
              Demo: hosted key. Production: Squads multisig.
            </span>
          )}
        </div>
      )}
      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No open disputes"
          description="When a buyer disputes an order, it lands here for review."
        />
      ) : (
        <div className="grid gap-3">
          {data.map((o) => (
            <Card key={o.address.toBase58()}>
              <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={orderPath(o.vendor, o.orderId)}
                      className="truncate font-medium hover:underline"
                    >
                      {o.title}
                    </Link>
                    <Amount raw={o.amount} className="text-sm" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    &ldquo;{o.disputeReason}&rdquo;
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      Buyer {o.buyer && <Address value={o.buyer} explorer={false} />}
                    </span>
                    <span className="flex items-center gap-1">
                      Vendor <Address value={o.vendor} explorer={false} />
                    </span>
                    {o.shippedAt && <span>Shipped {relativeTime(o.shippedAt)}</span>}
                  </div>
                </div>
                <ResolveDialog
                  order={o}
                  trigger={(open) => (
                    <Button onClick={open}>
                      <Scale /> Review
                    </Button>
                  )}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
