import type { OrderStatus } from "@trustpay/sdk";
import { STATUS_LABEL } from "@trustpay/sdk";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Lock,
  Scale,
  Truck,
  Undo2,
} from "lucide-react";

import type { BadgeVariant } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";

const STYLE: Record<OrderStatus, { variant: BadgeVariant; icon: typeof Lock }> = {
  created: { variant: "outline", icon: CircleDashed },
  funded: { variant: "info", icon: Lock },
  shipped: { variant: "violet", icon: Truck },
  disputed: { variant: "warning", icon: AlertTriangle },
  completed: { variant: "success", icon: CheckCircle2 },
  refunded: { variant: "secondary", icon: Undo2 },
  resolved: { variant: "secondary", icon: Scale },
  cancelled: { variant: "outline", icon: Ban },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { variant, icon: Icon } = STYLE[status];
  return (
    <Badge variant={variant}>
      <Icon />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
