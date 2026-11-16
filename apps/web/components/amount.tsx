import { formatTokenAmount } from "@trustpay/sdk";

import { PAYMENT_DECIMALS, PAYMENT_SYMBOL } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Amount({
  raw,
  className,
  symbolClassName,
}: {
  raw: bigint;
  className?: string;
  symbolClassName?: string;
}) {
  return (
    <span className={cn("tabular font-semibold tracking-tight", className)}>
      {formatTokenAmount(raw, PAYMENT_DECIMALS)}
      <span className={cn("ml-1 font-medium text-muted-foreground", symbolClassName)}>
        {PAYMENT_SYMBOL}
      </span>
    </span>
  );
}
