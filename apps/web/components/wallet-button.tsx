"use client";

import { formatTokenAmount, shortenAddress } from "@trustpay/sdk";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  ChevronDown,
  Copy,
  FlaskConical,
  LogOut,
  RefreshCw,
  ShoppingBag,
  Store,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEMO_ENABLED, PAYMENT_DECIMALS, PAYMENT_SYMBOL } from "@/lib/config";
import { useBalances } from "@/lib/data";
import { useSigner } from "@/lib/signer";

function BalanceLine({ owner }: { owner: PublicKey }) {
  const { data } = useBalances(owner);
  if (!data) return <span className="text-xs text-muted-foreground">Loading balance…</span>;
  return (
    <span className="tabular text-xs text-muted-foreground">
      {formatTokenAmount(data.token, PAYMENT_DECIMALS)} {PAYMENT_SYMBOL} ·{" "}
      {(data.lamports / LAMPORTS_PER_SOL).toFixed(3)} SOL
    </span>
  );
}

export function ConnectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const walletCtx = useWallet();
  const installed = walletCtx.wallets.filter(
    (w) =>
      w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable,
  );
  const { enableDemo, switchToBrowserWallet } = useSigner();
  const [starting, setStarting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            TrustPay runs on Solana devnet. No real money moves.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {installed.length === 0 && (
            <p className="rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
              No Solana wallet detected in this browser.{" "}
              <a
                className="font-medium text-foreground underline underline-offset-4"
                href="https://phantom.com/download"
                target="_blank"
                rel="noreferrer"
              >
                Get Phantom
              </a>{" "}
              and switch it to devnet.
            </p>
          )}
          {installed.map((w) => (
            <button
              key={w.adapter.name}
              type="button"
              onClick={() => {
                switchToBrowserWallet();
                walletCtx.select(w.adapter.name);
                onOpenChange(false);
              }}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-accent"
            >
              <Image
                src={w.adapter.icon}
                alt=""
                width={24}
                height={24}
                className="rounded-md"
                unoptimized
              />
              {w.adapter.name}
              <span className="ml-auto text-xs text-muted-foreground">Detected</span>
            </button>
          ))}
        </div>

        {DEMO_ENABLED && (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              or
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <FlaskConical className="mt-0.5 size-4 text-primary" />
                <div className="text-sm">
                  <p className="font-medium">Try it with demo wallets</p>
                  <p className="mt-1 text-muted-foreground">
                    We create a buyer and a vendor wallet in this browser and fund them with devnet
                    SOL and test {PAYMENT_SYMBOL}. Switch roles any time.
                  </p>
                </div>
              </div>
              <Button
                className="mt-4 w-full"
                loading={starting}
                onClick={() => {
                  setStarting(true);
                  enableDemo("vendor")
                    .then(() => {
                      toast.success("Demo wallets ready", {
                        description: `Funded with devnet SOL and test ${PAYMENT_SYMBOL}.`,
                      });
                      onOpenChange(false);
                    })
                    .catch((e: unknown) =>
                      toast.error("Couldn't fund demo wallets", {
                        description: e instanceof Error ? e.message : String(e),
                      }),
                    )
                    .finally(() => setStarting(false));
                }}
              >
                Start demo
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function WalletButton() {
  const wallet = useWallet();
  const { publicKey, mode, demo, switchDemoRole, switchToBrowserWallet, resetDemo, enableDemo } =
    useSigner();
  const [open, setOpen] = useState(false);

  if (!publicKey) {
    return (
      <>
        <Button onClick={() => setOpen(true)} size="sm">
          <Wallet />
          Connect
        </Button>
        <ConnectDialog open={open} onOpenChange={setOpen} />
      </>
    );
  }

  const isDemo = mode.kind === "demo";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 pl-2">
            {isDemo ? (
              <span className="flex items-center gap-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {mode.role === "vendor" ? (
                  <Store className="size-3" />
                ) : (
                  <ShoppingBag className="size-3" />
                )}
                Demo {mode.role}
              </span>
            ) : (
              <span className="size-2 rounded-full bg-emerald-500" />
            )}
            <span className="font-mono text-[13px]">{shortenAddress(publicKey.toBase58())}</span>
            <ChevronDown className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span>
              {isDemo ? `Demo ${mode.role} wallet` : (wallet.wallet?.adapter.name ?? "Wallet")}
            </span>
            <BalanceLine owner={publicKey} />
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() =>
              void navigator.clipboard
                .writeText(publicKey.toBase58())
                .then(() => toast.success("Address copied"))
            }
          >
            <Copy /> Copy address
          </DropdownMenuItem>
          {isDemo && demo && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Act as</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => switchDemoRole("vendor")}>
                <Store /> Vendor{" "}
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {shortenAddress(demo.vendor.publicKey.toBase58())}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => switchDemoRole("buyer")}>
                <ShoppingBag /> Buyer{" "}
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {shortenAddress(demo.buyer.publicKey.toBase58())}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  void enableDemo(mode.role)
                    .then(() => toast.success("Topped up from the devnet faucet"))
                    .catch((e: unknown) =>
                      toast.error(e instanceof Error ? e.message : "Faucet unavailable"),
                    )
                }
              >
                <RefreshCw /> Top up test funds
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          {isDemo ? (
            <>
              <DropdownMenuItem
                onSelect={() => {
                  switchToBrowserWallet();
                  setOpen(true);
                }}
              >
                <Wallet /> Use my own wallet
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={resetDemo} className="text-destructive">
                <LogOut /> Reset demo wallets
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onSelect={() => void wallet.disconnect()}>
              <LogOut /> Disconnect
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConnectDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
