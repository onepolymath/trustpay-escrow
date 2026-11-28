/**
 * Devnet smoke test: register a throwaway vendor, create an order, fund it, ship it and confirm
 * delivery, then print an Explorer link for every transaction.
 *
 *   pnpm tsx scripts/devnet-smoke.ts --funder-keypair ./keys/funder.json --mint <tUSDC mint>
 *
 * The funder pays SOL for the throwaway wallets and is the mint authority of the demo token.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { parseArgs } from "node:util";

import { TrustPayClient } from "@trustpay/sdk";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import type { TransactionInstruction } from "@solana/web3.js";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const { values } = parseArgs({
  options: {
    rpc: { type: "string", default: "https://api.devnet.solana.com" },
    "funder-keypair": { type: "string" },
    mint: { type: "string" },
  },
});
if (!values["funder-keypair"] || !values.mint)
  throw new Error("--funder-keypair and --mint are required");
if (/mainnet/i.test(values.rpc)) throw new Error("devnet only");

const funder = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(readFileSync(values["funder-keypair"].replace(/^~/, homedir()), "utf8")) as number[],
  ),
);
const mint = new PublicKey(values.mint);
const conn = new Connection(values.rpc, "confirmed");
const client = new TrustPayClient(conn);
const explorer = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

async function send(label: string, signers: Keypair[], ixs: TransactionInstruction[]) {
  const sig = await sendAndConfirmTransaction(conn, new Transaction().add(...ixs), signers, {
    commitment: "confirmed",
  });
  console.log(`${label.padEnd(16)} ${explorer(sig)}`);
  return sig;
}

const vendor = Keypair.generate();
const buyer = Keypair.generate();
const amount = 25_000_000n; // 25 tUSDC (6 decimals)

await send(
  "fund wallets",
  [funder],
  [
    SystemProgram.transfer({
      fromPubkey: funder.publicKey,
      toPubkey: vendor.publicKey,
      lamports: 20_000_000,
    }),
    SystemProgram.transfer({
      fromPubkey: funder.publicKey,
      toPubkey: buyer.publicKey,
      lamports: 20_000_000,
    }),
    createAssociatedTokenAccountIdempotentInstruction(
      funder.publicKey,
      getAssociatedTokenAddressSync(mint, buyer.publicKey),
      buyer.publicKey,
      mint,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      funder.publicKey,
      getAssociatedTokenAddressSync(mint, vendor.publicKey),
      vendor.publicKey,
      mint,
    ),
    createMintToInstruction(
      mint,
      getAssociatedTokenAddressSync(mint, buyer.publicKey),
      funder.publicKey,
      amount,
    ),
  ],
);

await send(
  "register vendor",
  [vendor],
  [await client.registerVendor({ vendor: vendor.publicKey, handle: "smoke.test" })],
);

const orderId = await client.nextOrderId(vendor.publicKey);
const orderAddress = client.orderAddress(vendor.publicKey, orderId);
await send(
  "create order",
  [vendor],
  [
    await client.createOrder({
      vendor: vendor.publicKey,
      mint,
      orderId,
      amount,
      title: "Devnet smoke test: Ankara wrap dress",
      shipWindowSecs: 3600,
      confirmWindowSecs: 3600,
    }),
  ],
);
console.log(
  `order account    https://explorer.solana.com/address/${orderAddress.toBase58()}?cluster=devnet`,
);

await send(
  "fund (escrow)",
  [buyer],
  [await client.fundOrder({ buyer: buyer.publicKey, order: { address: orderAddress, mint } })],
);
await send(
  "mark shipped",
  [vendor],
  [await client.markShipped({ address: orderAddress, vendor: vendor.publicKey }, "SMOKE-0001")],
);
const funded = {
  address: orderAddress,
  vendor: vendor.publicKey,
  mint,
  orderId,
  buyer: buyer.publicKey,
};
await send("confirm delivery", [buyer], [await client.confirmDelivery(funded)]);

const order = await client.fetchOrder(orderAddress);
const rep = await client.fetchVendor(vendor.publicKey);
console.log("order status     ", JSON.stringify(order?.status));
if (rep)
  console.log(
    `vendor profile    ${rep.handle}: ${rep.completed} completed, volume ${rep.volumeSettled.toString()} base units`,
  );
