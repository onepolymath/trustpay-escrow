"use client";

import { TRUSTPAY_PROGRAM_ID } from "@trustpay/sdk";
import { AlertTriangle } from "lucide-react";

import { useProgramStatus } from "@/lib/data";

/** Explains clearly when the devnet program or its config isn't reachable, instead of failing silently. */
export function ProgramStatusBanner() {
  const status = useProgramStatus();
  const data = status.data;
  const failed = Boolean(status.error as unknown);
  if (!data && !failed) return null;
  const problem = failed
    ? "Couldn't reach Solana devnet. Retrying in the background."
    : !data?.deployed
      ? `The TrustPay program (${TRUSTPAY_PROGRAM_ID.toBase58().slice(0, 8)}…) isn't deployed on devnet yet.`
      : !data.config
        ? "The program is deployed but not initialised yet."
        : null;
  if (!problem) return null;
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10">
      <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm text-amber-900 sm:px-6 dark:text-amber-200">
        <AlertTriangle className="size-4 shrink-0" />
        {problem}
      </p>
    </div>
  );
}
