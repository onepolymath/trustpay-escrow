"use client";

import { formatDuration } from "@trustpay/sdk";
import { useEffect, useState } from "react";

import { nowSecs } from "@/lib/utils";

export function useNow(intervalMs = 1_000): number {
  const [now, setNow] = useState(nowSecs);
  useEffect(() => {
    const id = setInterval(() => setNow(nowSecs()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function Countdown({ at, className }: { at: number; className?: string }) {
  const now = useNow();
  const remaining = at - now;
  return (
    <span className={className}>
      {remaining > 0 ? `in ${formatDuration(remaining)}` : `${formatDuration(-remaining)} ago`}
    </span>
  );
}
