"use client";

import type { OrderAccount } from "@trustpay/sdk";
import { actionApiUrl, blinkUrl, formatTokenAmount, orderPath, solanaPayUrl } from "@trustpay/sdk";
import { Check, Copy, MessageCircle, Zap } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { PAYMENT_DECIMALS, PAYMENT_SYMBOL, SITE_URL } from "@/lib/config";

function useOrigin(): string {
  const [origin, setOrigin] = useState(SITE_URL);
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 py-1 pr-1 pl-3">
        <span className="min-w-0 flex-1 truncate font-mono text-xs">{value}</span>
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Copy ${label}`}
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1_200);
            });
          }}
        >
          {copied ? <Check className="text-primary" /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

/** Everything a vendor needs to send a buyer: link, Blink, Solana Pay QR and a WhatsApp shortcut. */
export function SharePanel({ order }: { order: OrderAccount }) {
  const origin = useOrigin();
  const link = `${origin}${orderPath(order.vendor, order.orderId)}`;
  const action = actionApiUrl(origin, order.vendor, order.orderId);
  const price = `${formatTokenAmount(order.amount, PAYMENT_DECIMALS)} ${PAYMENT_SYMBOL}`;
  const message = `Hi! Here's your secure TrustPay link for "${order.title}" (${price}). Your payment stays in escrow until you confirm delivery: ${link}`;

  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
      <div className="mx-auto rounded-xl border border-border bg-white p-3">
        <QRCodeSVG value={solanaPayUrl(action)} size={148} level="M" marginSize={0} />
        <p className="mt-2 text-center text-[11px] text-neutral-500">Scan with a Solana wallet</p>
      </div>
      <div className="grid content-start gap-3">
        <CopyRow label="Order link" value={link} />
        <CopyRow label="Blink (pay inside X & Discord)" value={blinkUrl(action)} />
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" className="bg-[#25D366] text-white hover:bg-[#1fb757]">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle /> Send on WhatsApp
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={blinkUrl(action)} target="_blank" rel="noreferrer">
              <Zap /> Preview Blink
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
