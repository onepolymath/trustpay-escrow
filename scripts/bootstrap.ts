/**
 * One-time setup after deploying the program:
 *   1. initialise the config (arbiter + window bounds) as the upgrade authority,
 *   2. optionally create a demo payment mint whose mint authority is the faucet key,
 *   3. top up the demo arbiter so it can pay fees and ATA rent.
 *
 * Usage:
 *   pnpm bootstrap -- --rpc https://api.devnet.solana.com \
 *     --admin ~/.config/solana/id.json --arbiter-keypair ./keys/arbiter.json \
 *     --funder-keypair ./keys/funder.json [--mint <existing mint>]
 *
 * Prints the environment variables the web app needs. Keypair files never leave your machine.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { parseArgs } from "node:util";

import { TrustPayClient } from "@trustpay/sdk";
import { createMint } from "@solana/spl-token";
import type { TransactionInstruction } from "@solana/web3.js";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const { values } = parseArgs({
  options: {
    rpc: { type: "string", default: "https://api.devnet.solana.com" },
    admin: { type: "string", default: "~/.config/solana/id.json" },
    "arbiter-keypair": { type: "string" },
    "funder-keypair": { type: "string" },
    mint: { type: "string" },
    "min-window": { type: "string", default: "60" },
    "max-window": { type: "string", default: String(30 * 86_400) },
  },
});

const load = (path: string): Keypair =>
  Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(path.replace(/^~/, homedir()), "utf8")) as number[]),
  );

async function send(conn: Connection, payer: Keypair, ixs: TransactionInstruction[]) {
  return sendAndConfirmTransaction(conn, new Transaction().add(...ixs), [payer], {
    commitment: "confirmed",
  });
}

async function main() {
  if (/mainnet/i.test(values.rpc))
    throw new Error("This bootstrap script is for devnet/localnet only.");
  const conn = new Connection(values.rpc, "confirmed");
  const client = new TrustPayClient(conn);
  const admin = load(values.admin);
  const arbiter = values["arbiter-keypair"] ? load(values["arbiter-keypair"]) : null;
  const funder = values["funder-keypair"] ? load(values["funder-keypair"]) : null;

  console.log(`RPC        ${values.rpc}`);
  console.log(`Program    ${client.programId.toBase58()}`);
  console.log(`Admin      ${admin.publicKey.toBase58()}`);

  const existing = await client.fetchConfig();
  if (existing) {
    console.log(`Config     already initialised (arbiter ${existing.arbiter.toBase58()})`);
  } else {
    const arbiterKey = arbiter?.publicKey ?? admin.publicKey;
    const sig = await send(conn, admin, [
      await client.initializeConfig({
        admin: admin.publicKey,
        arbiter: arbiterKey,
        minWindowSecs: Number(values["min-window"]),
        maxWindowSecs: Number(values["max-window"]),
      }),
    ]);
    console.log(`Config     initialised, arbiter ${arbiterKey.toBase58()} (${sig})`);
  }

  let mint: PublicKey | null = values.mint ? new PublicKey(values.mint) : null;
  if (!mint && funder) {
    mint = await createMint(conn, admin, funder.publicKey, null, 6);
    console.log(`Mint       created demo mint ${mint.toBase58()} (authority = funder)`);
  }

  const topUp = async (who: PublicKey, label: string, sol: number) => {
    const bal = await conn.getBalance(who);
    if (bal >= sol * LAMPORTS_PER_SOL * 0.5) return;
    await send(conn, admin, [
      SystemProgram.transfer({
        fromPubkey: admin.publicKey,
        toPubkey: who,
        lamports: Math.round(sol * LAMPORTS_PER_SOL),
      }),
    ]);
    console.log(`Funded     ${label} with ${sol} SOL`);
  };
  if (arbiter) await topUp(arbiter.publicKey, "arbiter", 0.2);
  if (funder) await topUp(funder.publicKey, "faucet", Number(process.env["FAUCET_SOL"] ?? "1"));

  console.log("\nWeb app environment:");
  console.log(`NEXT_PUBLIC_RPC_URL=${values.rpc}`);
  if (mint) console.log(`NEXT_PUBLIC_PAYMENT_MINT=${mint.toBase58()}`);
  if (funder) {
    console.log("NEXT_PUBLIC_PAYMENT_SYMBOL=tUSDC");
    console.log("NEXT_PUBLIC_DEMO=1");
    console.log("DEMO_FUNDER_SECRET=<contents of the funder keypair file>");
  }
  if (arbiter) console.log("DEMO_ARBITER_SECRET=<contents of the arbiter keypair file>");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
