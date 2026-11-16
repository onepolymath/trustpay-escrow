import { TRUSTPAY_PROGRAM_ID } from "@trustpay/sdk";
import { NextResponse } from "next/server";

import { CLUSTER, DEMO_ENABLED, PAYMENT_MINT } from "@/lib/config";

export function GET() {
  return NextResponse.json({
    ok: true,
    cluster: CLUSTER,
    programId: TRUSTPAY_PROGRAM_ID.toBase58(),
    paymentMint: PAYMENT_MINT.toBase58(),
    demo: DEMO_ENABLED,
  });
}
