import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import type { TransactionInstruction } from "@solana/web3.js";
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DEMO_ENABLED, PAYMENT_DECIMALS, PAYMENT_MINT, RPC_URL } from "@/lib/config";
import { parsePublicKey } from "@/lib/params";
import { assertDevnet, keypairFromEnv } from "@/lib/server/keys";
import { rateLimited } from "@/lib/server/rate-limit";
import { getConnection } from "@/lib/solana";

/**
 * DEMO ONLY. Tops a devnet wallet up with a little SOL (for fees/rent) and test tokens from the
 * demo mint, whose mint authority is the server's funder key. Capped and rate-limited.
 */
export const dynamic = "force-dynamic";

const SOL_TARGET = 0.05 * LAMPORTS_PER_SOL;
const SOL_DRIP = 0.1 * LAMPORTS_PER_SOL;
const TOKEN_TARGET = 100n * 10n ** BigInt(PAYMENT_DECIMALS);
const TOKEN_DRIP = 500n * 10n ** BigInt(PAYMENT_DECIMALS);

const Body = z.object({ address: z.string().min(32).max(44) });

export async function POST(req: Request) {
  if (!DEMO_ENABLED) return NextResponse.json({ error: "Demo mode is off" }, { status: 404 });
  assertDevnet(RPC_URL);
  const funder = keypairFromEnv("DEMO_FUNDER_SECRET");
  if (!funder) return NextResponse.json({ error: "Faucet is not configured" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  const owner = parsed.success ? parsePublicKey(parsed.data.address) : null;
  if (!owner) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  if (rateLimited(`faucet:${owner.toBase58()}`, 20_000)) {
    return NextResponse.json({ error: "Slow down: try again in a few seconds" }, { status: 429 });
  }

  const conn = getConnection();
  const ata = getAssociatedTokenAddressSync(PAYMENT_MINT, owner, true);
  const [lamports, tokenBal] = await Promise.all([
    conn.getBalance(owner),
    conn
      .getTokenAccountBalance(ata)
      .then((b) => BigInt(b.value.amount))
      .catch(() => 0n),
  ]);

  const ixs: TransactionInstruction[] = [];
  if (lamports < SOL_TARGET) {
    ixs.push(
      SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: owner, lamports: SOL_DRIP }),
    );
  }
  if (tokenBal < TOKEN_TARGET) {
    ixs.push(
      createAssociatedTokenAccountIdempotentInstruction(funder.publicKey, ata, owner, PAYMENT_MINT),
      createMintToInstruction(PAYMENT_MINT, ata, funder.publicKey, TOKEN_DRIP),
    );
  }
  if (ixs.length === 0) return NextResponse.json({ ok: true, funded: false });

  try {
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
    const tx = new Transaction({ feePayer: funder.publicKey, blockhash, lastValidBlockHeight }).add(
      ...ixs,
    );
    tx.sign(funder);
    const signature = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return NextResponse.json({ ok: true, funded: true, signature });
  } catch (err) {
    console.error("faucet failed", err);
    return NextResponse.json(
      { error: "Faucet transaction failed. The demo faucet may be empty." },
      { status: 502 },
    );
  }
}
