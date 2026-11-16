import type { OrderAccount } from "@trustpay/sdk";
import { timeline } from "@trustpay/sdk";
import { Check, X } from "lucide-react";

import { cn, formatDateTime } from "@/lib/utils";

export function OrderTimeline({ order }: { order: OrderAccount }) {
  const steps = timeline(order);
  return (
    <ol className="grid gap-0">
      {steps.map((step, i) => (
        <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className={cn(
                "absolute top-6 left-[11px] h-[calc(100%-1.25rem)] w-px",
                step.state === "done" ? "bg-primary/50" : "bg-border",
              )}
              aria-hidden
            />
          )}
          <span
            className={cn(
              "relative z-10 grid size-[23px] shrink-0 place-items-center rounded-full border text-[11px]",
              step.state === "done" && "border-primary bg-primary text-primary-foreground",
              step.state === "current" && "border-primary bg-background ring-4 ring-primary/15",
              step.state === "upcoming" && "border-border bg-background",
              step.state === "failed" &&
                "border-muted-foreground/40 bg-muted text-muted-foreground",
            )}
          >
            {step.state === "done" && <Check className="size-3.5" strokeWidth={3} />}
            {step.state === "current" && <span className="size-2 rounded-full bg-primary" />}
            {step.state === "failed" && <X className="size-3.5" strokeWidth={3} />}
          </span>
          <div className="-mt-0.5">
            <p
              className={cn(
                "text-sm font-medium",
                step.state === "upcoming" && "text-muted-foreground",
              )}
            >
              {step.label}
            </p>
            {step.at && (
              <p className="tabular text-xs text-muted-foreground">{formatDateTime(step.at)}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
