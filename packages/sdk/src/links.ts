import type { PublicKey } from "@solana/web3.js";

export type Cluster = "devnet" | "mainnet-beta";

export function orderPath(vendor: PublicKey | string, orderId: bigint | number | string): string {
  return `/o/${vendor.toString()}/${orderId.toString()}`;
}

export function vendorPath(vendor: PublicKey | string): string {
  return `/v/${vendor.toString()}`;
}

/** Solana Actions endpoint for paying an order. Also a valid Solana Pay transaction request. */
export function actionApiUrl(
  origin: string,
  vendor: PublicKey | string,
  orderId: bigint | number | string,
): string {
  return `${origin.replace(/\/$/, "")}/api/actions/order/${vendor.toString()}/${orderId.toString()}`;
}

/** A Blink that renders the pay action inside X, Discord or any Blink-aware client. */
export function blinkUrl(actionUrl: string, cluster: Cluster = "devnet"): string {
  const params = new URLSearchParams({ action: `solana-action:${actionUrl}`, cluster });
  return `https://dial.to/?${params.toString()}`;
}

/** Solana Pay transaction-request URI for QR codes scanned by mobile wallets. */
export function solanaPayUrl(actionUrl: string): string {
  return `solana:${encodeURIComponent(actionUrl)}`;
}

export function explorerUrl(
  kind: "address" | "tx",
  value: string,
  cluster: Cluster = "devnet",
): string {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/${kind}/${value}${suffix}`;
}
