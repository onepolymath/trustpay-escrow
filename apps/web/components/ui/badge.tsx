import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-muted-foreground",
        success: "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
        warning: "border-transparent bg-amber-500/14 text-amber-700 dark:text-amber-400",
        danger: "border-transparent bg-red-500/12 text-red-700 dark:text-red-400",
        info: "border-transparent bg-sky-500/12 text-sky-700 dark:text-sky-400",
        violet: "border-transparent bg-violet-500/12 text-violet-700 dark:text-violet-400",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
