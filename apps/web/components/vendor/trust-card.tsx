import type { TrustTier, VendorProfileAccount } from "@trustpay/sdk";
import { TIER_LABEL, computeTrustScore, vendorPath } from "@trustpay/sdk";
import {
  ArrowUpRight,
  BadgeCheck,
  CircleAlert,
  CircleMinus,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Address } from "@/components/address";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TIER_STYLE: Record<TrustTier, { ring: string; text: string; icon: typeof BadgeCheck }> = {
  trusted: {
    ring: "stroke-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: BadgeCheck,
  },
  good: { ring: "stroke-teal-500", text: "text-teal-600 dark:text-teal-400", icon: BadgeCheck },
  new: { ring: "stroke-sky-500", text: "text-sky-600 dark:text-sky-400", icon: Sparkles },
  caution: {
    ring: "stroke-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    icon: CircleAlert,
  },
  "high-risk": {
    ring: "stroke-red-500",
    text: "text-red-600 dark:text-red-400",
    icon: ShieldAlert,
  },
};

export function ScoreRing({
  score,
  tier,
  size = 76,
}: {
  score: number;
  tier: TrustTier;
  size?: number;
}) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 76 76" className="size-full -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700", TIER_STYLE[tier].ring)}
        />
      </svg>
      <span className="tabular absolute inset-0 grid place-items-center text-xl font-semibold">
        {score}
      </span>
    </div>
  );
}

export function TrustCard({
  profile,
  showLink = true,
  className,
}: {
  profile: VendorProfileAccount;
  showLink?: boolean;
  className?: string;
}) {
  const trust = computeTrustScore(profile);
  const style = TIER_STYLE[trust.tier];
  const TierIcon = style.icon;
  return (
    <Card className={className}>
      <CardContent>
        <div className="flex items-center gap-4">
          <ScoreRing score={trust.score} tier={trust.tier} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{profile.handle}</p>
            <p className={cn("mt-0.5 flex items-center gap-1 text-sm font-medium", style.text)}>
              <TierIcon className="size-4" />
              {TIER_LABEL[trust.tier]}
            </p>
            <Address value={profile.vendor} className="mt-1 text-muted-foreground" />
          </div>
        </div>
        <ul className="mt-5 grid gap-2 text-sm">
          {trust.signals.map((s) => (
            <li key={s.text} className="flex items-center gap-2">
              {s.tone === "positive" && <BadgeCheck className="size-4 text-emerald-500" />}
              {s.tone === "negative" && <ShieldAlert className="size-4 text-red-500" />}
              {s.tone === "neutral" && <CircleMinus className="size-4 text-muted-foreground" />}
              <span className={cn(s.tone === "neutral" && "text-muted-foreground")}>{s.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-muted-foreground">
          Written only by the TrustPay program when orders settle. Vendors can&apos;t edit it.
        </p>
        {showLink && (
          <Link
            href={vendorPath(profile.vendor)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Full history <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
