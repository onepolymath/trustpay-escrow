import { NextResponse } from "next/server";

import { ACTION_HEADERS } from "@/lib/actions";

/** Maps human order links to their Action endpoints so Blink clients can unfurl them. */
export function GET() {
  return NextResponse.json(
    { rules: [{ pathPattern: "/o/*/*", apiPath: "/api/actions/order/*/*" }] },
    { headers: ACTION_HEADERS },
  );
}

export const OPTIONS = GET;
