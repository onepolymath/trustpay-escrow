"use client";

import { explorerUrl, parseProgramError } from "@trustpay/sdk";
import type { TransactionInstruction } from "@solana/web3.js";
import { useState } from "react";
import { toast } from "sonner";

import { useRefreshAll } from "./data";
import { useSigner } from "./signer";

function friendlyError(err: unknown): string {
  const program = parseProgramError(err);
  if (program) return program.message;
  const msg = err instanceof Error ? err.message : String(err);
  if (/rejected|declined/i.test(msg)) return "You cancelled the request in your wallet.";
  if (/insufficient (funds|lamports)|0x1\b/i.test(msg))
    return "Not enough balance for this payment.";
  if (/blockhash|expired/i.test(msg)) return "The network was slow. Please try again.";
  return msg.length > 160 ? `${msg.slice(0, 157)}…` : msg;
}

/** Runs a transaction with consistent pending/success/error feedback and cache refresh. */
export function useTransaction() {
  const { send } = useSigner();
  const refresh = useRefreshAll();
  const [pending, setPending] = useState<string | null>(null);

  async function run(
    label: string,
    build: () => Promise<TransactionInstruction[]>,
    opts: { success?: string } = {},
  ): Promise<string | null> {
    setPending(label);
    const id = toast.loading(`${label}…`);
    try {
      const signature = await send(await build());
      toast.success(opts.success ?? "Done", {
        id,
        description: "Confirmed on Solana devnet.",
        action: {
          label: "View",
          onClick: () => window.open(explorerUrl("tx", signature), "_blank", "noopener"),
        },
      });
      await refresh();
      return signature;
    } catch (err) {
      toast.error(`${label} failed`, { id, description: friendlyError(err) });
      return null;
    } finally {
      setPending(null);
    }
  }

  return { run, pending };
}
