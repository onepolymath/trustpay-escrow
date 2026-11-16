"use client";

import { explorerUrl, shortenAddress } from "@trustpay/sdk";
import type { PublicKey } from "@solana/web3.js";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function Address({
  value,
  className,
  chars = 4,
  explorer = true,
}: {
  value: PublicKey | string;
  className?: string;
  chars?: number;
  explorer?: boolean;
}) {
  const text = value.toString();
  const [copied, setCopied] = useState(false);
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-[13px]", className)}>
      <span title={text}>{shortenAddress(text, chars)}</span>
      <button
        type="button"
        aria-label="Copy address"
        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => {
          void navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1_200);
          });
        }}
      >
        {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
      </button>
      {explorer && (
        <a
          href={explorerUrl("address", text)}
          target="_blank"
          rel="noreferrer"
          aria-label="View on Solana Explorer"
          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </span>
  );
}
