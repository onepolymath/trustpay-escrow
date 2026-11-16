import { ArrowRight, BadgeCheck, Clock, Lock, Scale, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";

import { HeroDemoButton, LiveStats } from "@/components/home-client";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/vendor/trust-card";

const STEPS = [
  {
    icon: Lock,
    title: "Buyer pays into escrow",
    body: "Money goes to a Solana program, not the vendor. Nobody can touch it, not even us.",
  },
  {
    icon: Truck,
    title: "Vendor ships",
    body: "They have a deadline. Miss it and the buyer can take the money straight back.",
  },
  {
    icon: BadgeCheck,
    title: "Buyer confirms, vendor gets paid",
    body: "Or it auto-releases after the window, so honest vendors are never held hostage.",
  },
  {
    icon: Scale,
    title: "Problems go to an arbiter",
    body: "Disputes freeze the funds. The arbiter can only pay the buyer or the vendor, nobody else.",
  },
];

const SCAMS = [
  [
    "“Pay first, I'll send it tomorrow”",
    "Funds stay locked until delivery. No shipment means an automatic refund.",
  ],
  [
    "Fake payment screenshots",
    "Vendors see the escrow on chain. A screenshot proves nothing; the program does.",
  ],
  ["Chargeback after delivery", "Once the buyer confirms or the window ends, payment is final."],
  [
    "“Trust me, I have 10k followers”",
    "Reputation comes from settled orders and lost disputes, written only by the program.",
  ],
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" /> Buyer protection for social commerce
            </span>
            <h1 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-[54px]">
              Buy from Instagram vendors without getting scammed.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
              TrustPay holds your payment in a Solana escrow until you confirm delivery. Every
              vendor carries a reputation that only real, settled orders can build.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <HeroDemoButton />
              <Button asChild size="lg" variant="outline">
                <Link href="/sell">
                  I&apos;m a vendor <ArrowRight />
                </Link>
              </Button>
            </div>
            <LiveStats />
          </div>

          <div className="relative hidden lg:block">
            <div
              className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-emerald-400/20 via-transparent to-teal-500/10 blur-2xl"
              aria-hidden
            />
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Order #12 · @ummie.styles</p>
                  <p className="mt-1 font-medium">Ankara wrap dress, size M</p>
                </div>
                <span className="rounded-full bg-violet-500/12 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-400">
                  Shipped
                </span>
              </div>
              <p className="tabular mt-6 text-4xl font-semibold tracking-tight">
                25.00 <span className="text-lg text-muted-foreground">USDC</span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Lock className="size-3.5" /> Locked in escrow
              </p>
              <div className="mt-6 flex items-center gap-4 rounded-xl bg-muted/60 p-4">
                <ScoreRing score={92} tier="trusted" size={60} />
                <div className="text-sm">
                  <p className="font-medium">Trusted vendor</p>
                  <p className="text-muted-foreground">23 delivered · 0 disputes lost</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" /> Auto-releases to vendor in 2d 4h unless you dispute
              </div>
              <div className="mt-6 grid gap-2">
                <div className="flex h-11 items-center justify-center rounded-lg bg-primary text-[15px] font-medium text-primary-foreground">
                  I received it, release funds
                </div>
                <div className="flex h-9 items-center justify-center rounded-lg border border-border text-sm">
                  Open a dispute
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Four steps, every one enforced by an Anchor program on Solana.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-4.5" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <p className="mt-4 font-medium">{s.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Built for the scams people actually hit
            </h2>
            <p className="mt-3 text-muted-foreground">
              Across Nigeria and the wider Global South, buying from social-media vendors means
              wiring money to a stranger and hoping. TrustPay replaces hope with code.
            </p>
          </div>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {SCAMS.map(([scam, fix]) => (
              <div key={scam} className="grid gap-1 p-5 sm:grid-cols-[1fr_1.4fr] sm:gap-6">
                <p className="font-medium">{scam}</p>
                <p className="text-sm text-muted-foreground">{fix}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
