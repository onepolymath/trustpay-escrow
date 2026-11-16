import { TRUSTPAY_PROGRAM_ID, explorerUrl, shortenAddress } from "@trustpay/sdk";

import { REPO_URL } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>TrustPay · Escrow for social commerce, on Solana. Devnet demo, no real funds.</p>
        <div className="flex gap-5">
          <a
            className="hover:text-foreground"
            href={explorerUrl("address", TRUSTPAY_PROGRAM_ID.toBase58())}
            target="_blank"
            rel="noreferrer"
          >
            Program{" "}
            <span className="font-mono">{shortenAddress(TRUSTPAY_PROGRAM_ID.toBase58())}</span>
          </a>
          <a className="hover:text-foreground" href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
