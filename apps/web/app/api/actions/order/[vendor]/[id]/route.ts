import { NextResponse } from "next/server";
import { z } from "zod";

import { ACTION_HEADERS, buildActionMetadata } from "@/lib/actions";
import { PAYMENT_DECIMALS, PAYMENT_SYMBOL } from "@/lib/config";
import { parseOrderParams, parsePublicKey } from "@/lib/params";
import { getClient } from "@/lib/solana";

/**
 * Solana Action (Blink) + Solana Pay transaction request for paying an order.
 * GET describes the order; POST returns an unsigned `fund_order` transaction for the wallet.
 */
interface Ctx {
  params: Promise<{ vendor: string; id: string }>;
}

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new NextResponse(null, { headers: ACTION_HEADERS });
}

export async function GET(req: Request, { params }: Ctx) {
  const parsed = parseOrderParams(await params);
  if (!parsed)
    return NextResponse.json(
      { message: "Invalid order link" },
      { status: 400, headers: ACTION_HEADERS },
    );
  const client = getClient();
  const [order, profile] = await Promise.all([
    client.fetchOrderById(parsed.vendor, parsed.orderId),
    client.fetchVendor(parsed.vendor),
  ]);
  const url = new URL(req.url);
  const body = buildActionMetadata({
    order,
    profile,
    origin: url.origin,
    href: url.pathname,
    symbol: PAYMENT_SYMBOL,
    decimals: PAYMENT_DECIMALS,
  });
  return NextResponse.json(body, { headers: ACTION_HEADERS });
}

const PostBody = z.object({ account: z.string().min(32).max(44) });

export async function POST(req: Request, { params }: Ctx) {
  const parsed = parseOrderParams(await params);
  const body = PostBody.safeParse(await req.json().catch(() => null));
  const buyer = body.success ? parsePublicKey(body.data.account) : null;
  if (!parsed || !buyer) {
    return NextResponse.json(
      { message: "Invalid request" },
      { status: 400, headers: ACTION_HEADERS },
    );
  }
  const client = getClient();
  const order = await client.fetchOrderById(parsed.vendor, parsed.orderId);
  if (order?.status !== "created") {
    return NextResponse.json(
      { message: "This order is not open for payment" },
      { status: 409, headers: ACTION_HEADERS },
    );
  }
  if (order.reservedBuyer && !order.buyer?.equals(buyer)) {
    return NextResponse.json(
      { message: "This order is reserved for another buyer" },
      { status: 403, headers: ACTION_HEADERS },
    );
  }
  const tx = await client.buildTransaction([await client.fundOrder({ buyer, order })], buyer);
  return NextResponse.json(
    {
      type: "transaction",
      transaction: tx
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64"),
      message: `Paid into TrustPay escrow. Funds release to the vendor when you confirm delivery.`,
    },
    { headers: ACTION_HEADERS },
  );
}
