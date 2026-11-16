"use client";

import { activeDeadline, explorerUrl, findVaultAddress, roleOf } from "@trustpay/sdk";
import { PublicKey } from "@solana/web3.js";
import { ArrowLeft, Clock, ExternalLink, Info, Lock, SearchX, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Address } from "@/components/address";
import { Amount } from "@/components/amount";
import { EmptyState } from "@/components/empty-state";
import { Countdown, useNow } from "@/components/order/countdown";
import { OrderActions } from "@/components/order/order-actions";
import { SharePanel } from "@/components/order/share-panel";
import { StatusBadge } from "@/components/order/status-badge";
import { OrderTimeline } from "@/components/order/timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrustCard } from "@/components/vendor/trust-card";
import { useOrder, useProgramStatus, useVendor } from "@/lib/data";
import { useSigner } from "@/lib/signer";
import { formatDateTime } from "@/lib/utils";

const ROLE_LABEL = {
  vendor: "You're the vendor",
  buyer: "You're the buyer",
  arbiter: "You're the arbiter",
  visitor: null,
} as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export function OrderView({
  vendor: vendorStr,
  orderId: idStr,
}: {
  vendor: string;
  orderId: string;
}) {
  const vendor = useMemo(() => new PublicKey(vendorStr), [vendorStr]);
  const orderId = useMemo(() => BigInt(idStr), [idStr]);
  const { data: order, isLoading } = useOrder(vendor, orderId);
  const { data: profile } = useVendor(vendor);
  const { data: status } = useProgramStatus();
  const { publicKey } = useSigner();
  const now = useNow();

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-[480px] rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={SearchX}
          title="Order not found"
          description="This link doesn't match any TrustPay order on devnet. Check that you have the full link from your vendor."
          action={
            <Button asChild variant="outline">
              <Link href="/">Go home</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const role = roleOf(order, { wallet: publicKey, arbiter: status?.config?.arbiter ?? null });
  const deadline = activeDeadline(order, now);
  const vault = findVaultAddress(order.address, order.mint);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href={role === "vendor" ? "/sell" : role === "buyer" ? "/buy" : "/"}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-6">
          <Card>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={order.status} />
                {ROLE_LABEL[role] && (
                  <span className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</span>
                )}
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  Order #{order.orderId.toString()}
                </span>
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance">
                {order.title}
              </h1>
              <Amount
                raw={order.amount}
                className="mt-3 block text-4xl"
                symbolClassName="text-xl"
              />

              {order.status === "created" ? (
                <div className="mt-6 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Your payment is protected</p>
                    <p className="mt-1 text-muted-foreground">
                      You pay into an escrow account controlled by the TrustPay program. The vendor
                      only gets paid when you confirm delivery. If they don&apos;t ship in time, you
                      take it back.
                    </p>
                  </div>
                </div>
              ) : deadline ? (
                <div className="mt-6 flex items-center gap-3 rounded-xl bg-muted/60 p-4 text-sm">
                  <Clock className="size-5 shrink-0 text-muted-foreground" />
                  <p>
                    <span className="text-muted-foreground">{deadline.label} </span>
                    <span className="font-medium">{formatDateTime(deadline.at)}</span>{" "}
                    <Countdown at={deadline.at} className="text-muted-foreground" />
                  </p>
                </div>
              ) : null}

              {order.status === "disputed" && (
                <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-200">
                    Dispute opened by the buyer
                  </p>
                  <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">
                    &ldquo;{order.disputeReason}&rdquo;
                  </p>
                </div>
              )}

              <div className="mt-6">
                <OrderActions order={order} />
              </div>
            </CardContent>
          </Card>

          {role === "vendor" && order.status === "created" && (
            <Card>
              <CardHeader>
                <CardTitle>Share with your buyer</CardTitle>
              </CardHeader>
              <CardContent>
                <SharePanel order={order} />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTimeline order={order} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>On-chain details</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <dl className="divide-y divide-border">
                  <Row label="Order account">
                    <Address value={order.address} />
                  </Row>
                  <Row label="Escrow vault">
                    <Address value={vault} />
                  </Row>
                  <Row label="Buyer">
                    {order.buyer ? (
                      <Address value={order.buyer} />
                    ) : (
                      <span className="text-muted-foreground">Anyone</span>
                    )}
                  </Row>
                  {order.tracking && (
                    <Row label="Tracking">
                      <span className="font-mono text-[13px]">{order.tracking}</span>
                    </Row>
                  )}
                  {(order.buyerPayout > 0n || order.vendorPayout > 0n) && (
                    <>
                      <Row label="Paid to buyer">
                        <Amount raw={order.buyerPayout} className="text-sm font-medium" />
                      </Row>
                      <Row label="Paid to vendor">
                        <Amount raw={order.vendorPayout} className="text-sm font-medium" />
                      </Row>
                    </>
                  )}
                </dl>
                <a
                  href={explorerUrl("address", order.address.toBase58())}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View on Solana Explorer <ExternalLink className="size-3.5" />
                </a>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid h-fit gap-4 lg:sticky lg:top-20">
          {profile ? <TrustCard profile={profile} /> : <Skeleton className="h-72 rounded-xl" />}
          <div className="flex gap-2.5 rounded-xl border border-border p-4 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Funds can only ever move to this order&apos;s buyer or vendor. Not even the arbiter
              can send them elsewhere.
            </p>
          </div>
          <div className="flex gap-2.5 rounded-xl border border-border p-4 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <p>Devnet demo: test tokens only, no real money.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
