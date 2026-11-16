import { PublicKey, Transaction } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DEMO_ENABLED, RPC_URL } from "@/lib/config";
import { assertDevnet, keypairFromEnv } from "@/lib/server/keys";
import { rateLimited } from "@/lib/server/rate-limit";
import { getClient, getConnection } from "@/lib/solana";

/**
 * DEMO ONLY. Lets visitors play the arbiter role without holding the arbiter key: the server
 * signs `resolve_dispute` with a devnet demo arbiter. The program still enforces every rule
 * (order must be disputed, payouts only to the order's own buyer and vendor).
 * In production the arbiter is a Squads multisig and this route does not exist.
 */
export const dynamic = "force-dynamic";

const Body = z.object({
  order: z.string().min(32).max(44),
  buyerBps: z.number().int().min(0).max(10_000),
});

export async function POST(req: Request) {
  if (!DEMO_ENABLED) return NextResponse.json({ error: "Demo mode is off" }, { status: 404 });
  assertDevnet(RPC_URL);
  const arbiter = keypairFromEnv("DEMO_ARBITER_SECRET");
  if (!arbiter)
    return NextResponse.json({ error: "Demo arbiter is not configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (rateLimited(`arbiter:${parsed.data.order}`, 10_000)) {
    return NextResponse.json(
      { error: "A ruling for this order is already in flight" },
      { status: 429 },
    );
  }

  const client = getClient();
  let address: PublicKey;
  try {
    address = new PublicKey(parsed.data.order);
  } catch {
    return NextResponse.json({ error: "Invalid order address" }, { status: 400 });
  }
  const [order, config] = await Promise.all([client.fetchOrder(address), client.fetchConfig()]);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "disputed")
    return NextResponse.json({ error: "Order is not in dispute" }, { status: 409 });
  if (!config?.arbiter.equals(arbiter.publicKey)) {
    return NextResponse.json(
      { error: "Demo arbiter is not the configured arbiter" },
      { status: 409 },
    );
  }

  try {
    const conn = getConnection();
    const ix = await client.resolveDispute({
      arbiter: arbiter.publicKey,
      order,
      buyerBps: parsed.data.buyerBps,
    });
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: arbiter.publicKey,
      blockhash,
      lastValidBlockHeight,
    }).add(ix);
    tx.sign(arbiter);
    const signature = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return NextResponse.json({ signature });
  } catch (err) {
    console.error("demo arbiter failed", err);
    return NextResponse.json({ error: "Ruling transaction failed" }, { status: 502 });
  }
}
