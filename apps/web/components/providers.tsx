"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { SWRConfig } from "swr";

import { RPC_URL } from "@/lib/config";
import { SignerProvider } from "@/lib/signer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ConnectionProvider endpoint={RPC_URL} config={{ commitment: "confirmed" }}>
        {/* Wallet Standard auto-detects Phantom, Solflare, Backpack and others. */}
        <WalletProvider wallets={[]} autoConnect>
          <SignerProvider>
            <SWRConfig value={{ shouldRetryOnError: false, keepPreviousData: true }}>
              {children}
            </SWRConfig>
          </SignerProvider>
        </WalletProvider>
      </ConnectionProvider>
      <Toaster richColors closeButton position="bottom-right" />
    </ThemeProvider>
  );
}
