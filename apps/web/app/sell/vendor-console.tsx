"use client";

import type { OrderAccount } from "@trustpay/sdk";
import { MAX_HANDLE_LEN, MAX_TITLE_LEN, parseTokenAmount } from "@trustpay/sdk";
import { PublicKey } from "@solana/web3.js";
import { PackageOpen, Plus, Store, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { OrderListSkeleton, OrderRow } from "@/components/order/order-row";
import { SharePanel } from "@/components/order/share-panel";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldHint, Input, Label, NativeSelect } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TrustCard } from "@/components/vendor/trust-card";
import { ConnectDialog } from "@/components/wallet-button";
import {
  DEMO_ENABLED,
  PAYMENT_DECIMALS,
  PAYMENT_MINT,
  PAYMENT_SYMBOL,
  WINDOW_PRESETS,
} from "@/lib/config";
import { useOrders, useVendor } from "@/lib/data";
import { useSigner } from "@/lib/signer";
import { getClient } from "@/lib/solana";
import { useTransaction } from "@/lib/use-transaction";

const presets = WINDOW_PRESETS.filter((p) => DEMO_ENABLED || !p.demoOnly);

function RegisterCard() {
  const { publicKey } = useSigner();
  const { run, pending } = useTransaction();
  const [handle, setHandle] = useState("");
  const normalised = handle.trim().startsWith("@") ? handle.trim() : `@${handle.trim()}`;
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Store className="size-5" />
        </div>
        <CardTitle className="text-lg">Open your TrustPay storefront</CardTitle>
        <CardDescription>
          This creates your public reputation record on Solana. Buyers see it before they pay, and
          only settled orders can change it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!publicKey) return;
            void run(
              "Creating storefront",
              async () => [
                await getClient().registerVendor({ vendor: publicKey, handle: normalised }),
              ],
              {
                success: "Storefront created",
              },
            );
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="handle">Instagram, WhatsApp or X handle</Label>
            <Input
              id="handle"
              placeholder="@ummie.styles"
              value={handle}
              maxLength={MAX_HANDLE_LEN - 1}
              onChange={(e) => setHandle(e.target.value)}
            />
            <FieldHint>Shown on every order link you share.</FieldHint>
          </div>
          <Button
            type="submit"
            size="lg"
            loading={pending !== null}
            disabled={handle.trim().length === 0}
          >
            Create storefront
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateOrderCard({
  nextId,
  onCreated,
}: {
  nextId: bigint;
  onCreated: (vendor: PublicKey, id: bigint) => void;
}) {
  const { publicKey } = useSigner();
  const { run, pending } = useTransaction();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [ship, setShip] = useState<number>(presets[DEMO_ENABLED ? 0 : 1]?.secs ?? 86_400);
  const [confirm, setConfirm] = useState<number>(presets[DEMO_ENABLED ? 0 : 2]?.secs ?? 3 * 86_400);
  const [buyer, setBuyer] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!publicKey) return;
    let amount: bigint;
    let reserved: PublicKey | undefined;
    try {
      amount = parseTokenAmount(price, PAYMENT_DECIMALS);
      reserved = buyer.trim() ? new PublicKey(buyer.trim()) : undefined;
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "Invalid public key input"
          ? err.message
          : "Enter a valid buyer wallet address",
      );
      return;
    }
    setError(null);
    void run(
      "Creating order",
      async () => [
        await getClient().createOrder({
          vendor: publicKey,
          mint: PAYMENT_MINT,
          orderId: nextId,
          amount,
          title: title.trim(),
          shipWindowSecs: ship,
          confirmWindowSecs: confirm,
          buyer: reserved,
        }),
      ],
      { success: "Order created. Share the link with your buyer." },
    ).then((sig) => {
      if (sig) {
        setTitle("");
        setPrice("");
        setBuyer("");
        onCreated(publicKey, nextId);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New order</CardTitle>
        <CardDescription>Create a payment link for something you&apos;re selling.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="title">Item</Label>
            <Input
              id="title"
              placeholder="Ankara wrap dress, size M"
              value={title}
              maxLength={MAX_TITLE_LEN}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="price">Price</Label>
            <div className="relative">
              <Input
                id="price"
                inputMode="decimal"
                placeholder="25.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pr-16"
                aria-invalid={error !== null}
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                {PAYMENT_SYMBOL}
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ship">You&apos;ll ship within</Label>
              <NativeSelect
                id="ship"
                value={ship}
                onChange={(e) => setShip(Number(e.target.value))}
              >
                {presets.map((p) => (
                  <option key={p.secs} value={p.secs}>
                    {p.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">Buyer has to confirm within</Label>
              <NativeSelect
                id="confirm"
                value={confirm}
                onChange={(e) => setConfirm(Number(e.target.value))}
              >
                {presets.map((p) => (
                  <option key={p.secs} value={p.secs}>
                    {p.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="buyer">
              Reserve for a buyer{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="buyer"
              placeholder="Buyer's Solana address"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            size="lg"
            loading={pending !== null}
            disabled={!title.trim() || !price.trim()}
          >
            <Plus /> Create order link
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function VendorConsole() {
  const { publicKey } = useSigner();
  const [connectOpen, setConnectOpen] = useState(false);
  const [shareFor, setShareFor] = useState<OrderAccount | null>(null);
  const [justCreated, setJustCreated] = useState<{ vendor: PublicKey; id: bigint } | null>(null);
  const vendor = useVendor(publicKey);
  const orders = useOrders({ vendor: publicKey }, !!publicKey && !!vendor.data);

  // Open the share sheet as soon as the freshly created order shows up on chain.
  useEffect(() => {
    if (!justCreated) return;
    const created = orders.data?.find(
      (o) => o.orderId === justCreated.id && o.vendor.equals(justCreated.vendor),
    );
    if (created) {
      setShareFor(created);
      setJustCreated(null);
    }
  }, [justCreated, orders.data]);

  if (!publicKey) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <PageHeader
          title="Sell with TrustPay"
          description="Create escrow-protected payment links for your Instagram, WhatsApp and X customers."
        />
        <EmptyState
          icon={Wallet}
          title="Connect a wallet to start selling"
          description={
            DEMO_ENABLED
              ? "Or start the demo to get a funded test wallet in one click."
              : "Phantom, Solflare and Backpack all work on devnet."
          }
          action={<Button onClick={() => setConnectOpen(true)}>Connect</Button>}
        />
        <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
      </div>
    );
  }

  if (vendor.isLoading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_340px]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!vendor.data) {
    return (
      <div className="px-4 py-16 sm:px-6">
        <RegisterCard />
      </div>
    );
  }

  const profile = vendor.data;
  const list = orders.data ?? [];
  const needsAction = list.filter((o) => o.status === "funded").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader
        title={`Hi, ${profile.handle}`}
        description={
          needsAction > 0
            ? `${needsAction} paid order${needsAction > 1 ? "s" : ""} waiting for you to ship.`
            : "Create a link, send it to your buyer, get paid when they confirm."
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-6">
          <CreateOrderCard
            nextId={profile.ordersCreated}
            onCreated={(v, id) => setJustCreated({ vendor: v, id })}
          />
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Your orders</CardTitle>
              <span className="text-sm text-muted-foreground">{list.length} total</span>
            </CardHeader>
            <div className="mt-4 border-t border-border">
              {orders.isLoading ? (
                <OrderListSkeleton />
              ) : list.length === 0 ? (
                <EmptyState
                  icon={PackageOpen}
                  title="No orders yet"
                  description="Your first order link will show up here."
                  className="m-5 border-0"
                />
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
        <TrustCard profile={profile} className="h-fit lg:sticky lg:top-20" />
      </div>

      <Dialog open={shareFor !== null} onOpenChange={(o) => !o && setShareFor(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Share with your buyer</DialogTitle>
            <DialogDescription>{shareFor?.title}</DialogDescription>
          </DialogHeader>
          {shareFor && <SharePanel order={shareFor} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
