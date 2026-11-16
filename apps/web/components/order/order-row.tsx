import type { OrderAccount } from "@trustpay/sdk";
import { orderPath } from "@trustpay/sdk";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Amount } from "@/components/amount";
import { StatusBadge } from "@/components/order/status-badge";
import { relativeTime } from "@/lib/utils";

export function OrderRow({ order }: { order: OrderAccount }) {
  return (
    <Link
      href={orderPath(order.vendor, order.orderId)}
      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{order.title}</p>
          <span className="font-mono text-xs text-muted-foreground">
            #{order.orderId.toString()}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Created {relativeTime(order.createdAt)}
        </p>
      </div>
      <StatusBadge status={order.status} />
      <Amount raw={order.amount} className="hidden w-32 text-right text-sm sm:block" />
      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function OrderListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
