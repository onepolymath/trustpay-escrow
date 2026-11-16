import { Compass } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="That link doesn't point anywhere on TrustPay."
        action={
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        }
      />
    </div>
  );
}
