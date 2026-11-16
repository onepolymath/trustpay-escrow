"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getClient } from "./solana";
import type { DemoRole, DemoWallets } from "./demo-wallets";
import { clearDemoWallets, createDemoWallets, loadDemoWallets } from "./demo-wallets";

type Mode = { kind: "wallet" } | { kind: "demo"; role: DemoRole };

export interface SignerContextValue {
  /** The wallet that will sign, or null when nothing is connected. */
  publicKey: PublicKey | null;
  mode: Mode;
  demo: DemoWallets | null;
  /** Builds, signs, sends and confirms a transaction. Resolves with the signature. */
  send: (instructions: TransactionInstruction[]) => Promise<string>;
  enableDemo: (role?: DemoRole) => Promise<void>;
  switchDemoRole: (role: DemoRole) => void;
  switchToBrowserWallet: () => void;
  resetDemo: () => void;
}

const SignerContext = createContext<SignerContextValue | null>(null);

async function requestFaucet(addresses: PublicKey[]): Promise<void> {
  await Promise.all(
    addresses.map((a) =>
      fetch("/api/demo/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: a.toBase58() }),
      }).then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Faucet unavailable");
        }
      }),
    ),
  );
}

export function SignerProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [demo, setDemo] = useState<DemoWallets | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "wallet" });

  useEffect(() => {
    const stored = loadDemoWallets();
    if (stored) {
      setDemo(stored);
      const role = window.localStorage.getItem("trustpay.demo-role");
      if (role === "buyer" || role === "vendor") setMode({ kind: "demo", role });
    }
  }, []);

  const publicKey = mode.kind === "demo" ? (demo?.[mode.role].publicKey ?? null) : wallet.publicKey;

  const send = useCallback(
    async (instructions: TransactionInstruction[]) => {
      if (!publicKey) throw new Error("Connect a wallet first");
      const client = getClient();
      const tx = await client.buildTransaction(instructions, publicKey);
      let signature: string;
      if (mode.kind === "demo" && demo) {
        tx.sign(demo[mode.role]);
        signature = await connection.sendRawTransaction(tx.serialize());
      } else {
        signature = await wallet.sendTransaction(tx, connection);
      }
      const blockhash = tx.recentBlockhash;
      const lastValidBlockHeight = tx.lastValidBlockHeight;
      if (!blockhash || lastValidBlockHeight === undefined) throw new Error("Missing blockhash");
      const res = await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
      );
      if (res.value.err) throw new Error(JSON.stringify(res.value.err));
      return signature;
    },
    [publicKey, mode, demo, connection, wallet],
  );

  const enableDemo = useCallback(
    async (role: DemoRole = "vendor") => {
      const wallets = demo ?? createDemoWallets();
      setDemo(wallets);
      setMode({ kind: "demo", role });
      window.localStorage.setItem("trustpay.demo-role", role);
      await requestFaucet([wallets.buyer.publicKey, wallets.vendor.publicKey]);
    },
    [demo],
  );

  const switchDemoRole = useCallback((role: DemoRole) => {
    setMode({ kind: "demo", role });
    window.localStorage.setItem("trustpay.demo-role", role);
  }, []);

  const switchToBrowserWallet = useCallback(() => {
    setMode({ kind: "wallet" });
    window.localStorage.removeItem("trustpay.demo-role");
  }, []);

  const resetDemo = useCallback(() => {
    clearDemoWallets();
    window.localStorage.removeItem("trustpay.demo-role");
    setDemo(null);
    setMode({ kind: "wallet" });
  }, []);

  const value = useMemo<SignerContextValue>(
    () => ({
      publicKey,
      mode,
      demo,
      send,
      enableDemo,
      switchDemoRole,
      switchToBrowserWallet,
      resetDemo,
    }),
    [publicKey, mode, demo, send, enableDemo, switchDemoRole, switchToBrowserWallet, resetDemo],
  );

  return <SignerContext.Provider value={value}>{children}</SignerContext.Provider>;
}

export function useSigner(): SignerContextValue {
  const ctx = useContext(SignerContext);
  if (!ctx) throw new Error("useSigner must be used inside <SignerProvider>");
  return ctx;
}
