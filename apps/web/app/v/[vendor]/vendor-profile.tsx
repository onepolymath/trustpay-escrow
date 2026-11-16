"use client";

import { PublicKey } from "@solana/web3.js";
import { PackageOpen, UserX } from "lucide-react";
import { useMemo } from "react";

import { Amount } from "@/components/amount";
import { EmptyState } from "@/components/empty-state";
import { OrderListSkeleton, OrderRow } from "@/components/order/order-row";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrustCard } from "@/components/vendor/trust-card";
import { useOrders, useVendor } from "@/lib/data";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

export function VendorProfileView({ vendor: vendorStr }: { vendor: string }) {
  const vendor = useMemo(() => new PublicKey(vendorStr), [vendorStr]);
  const { data: profile, isLoading } = useVendor(vendor);
  const orders = useOrders({ vendor }, !!profile);

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[340px_1fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={UserX}
          title="No TrustPay storefront for this wallet"
          description="This address hasn't registered as a vendor. Be careful paying them outside escrow."
        />
      </div>
    );
  }

  const list = orders.data ?? [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <TrustCard profile={profile} showLink={false} className="h-fit" />
        <div className="grid content-start gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Delivered" value={profile.completed} />
            <Stat label="Disputes lost" value={profile.disputesLost} />
            <Stat label="Missed shipments" value={profile.missedShipments} />
            <Stat
              label="Volume settled"
              value={
                <Amount raw={profile.volumeSettled} className="text-xl" symbolClassName="text-sm" />
              }
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Order history</CardTitle>
            </CardHeader>
            <div className="mt-4 border-t border-border">
              {orders.isLoading ? (
                <OrderListSkeleton />
              ) : list.length === 0 ? (
                <EmptyState icon={PackageOpen} title="No orders yet" className="m-5 border-0" />
              ) : (
                <div className="divide-y divide-border">
                  {list.map((o) => (
                    <OrderRow key={o.address.toBase58()} order={o} />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
