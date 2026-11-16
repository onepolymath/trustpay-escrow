"use client";

import type { OrderStatus } from "@trustpay/sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import useSWR, { useSWRConfig } from "swr";

import { PAYMENT_MINT } from "./config";
import { getClient, getConnection } from "./solana";

const REFRESH = { refreshInterval: 8_000, revalidateOnFocus: true };

export function useProgramStatus() {
  return useSWR(
    ["program-status"],
    async () => {
      const client = getClient();
      const [program, config] = await Promise.all([
        getConnection().getAccountInfo(client.programId),
        client.fetchConfig(),
      ]);
      return { deployed: program?.executable === true, config };
    },
    { revalidateOnFocus: false },
  );
}

export function useVendor(vendor: PublicKey | null | undefined) {
  return useSWR(vendor ? ["vendor", vendor.toBase58()] : null, () =>
    vendor ? getClient().fetchVendor(vendor) : null,
  );
}

export function useOrder(vendor: PublicKey | null, orderId: bigint | null) {
  return useSWR(
    vendor && orderId !== null ? ["order", vendor.toBase58(), orderId.toString()] : null,
    () => (vendor && orderId !== null ? getClient().fetchOrderById(vendor, orderId) : null),
    REFRESH,
  );
}

export function useOrders(
  filter: { vendor?: PublicKey | null; buyer?: PublicKey | null; status?: OrderStatus },
  enabled = true,
) {
  const key = enabled
    ? [
        "orders",
        filter.vendor?.toBase58() ?? "",
        filter.buyer?.toBase58() ?? "",
        filter.status ?? "",
      ]
    : null;
  return useSWR(
    key,
    () =>
      getClient().listOrders({
        ...(filter.vendor ? { vendor: filter.vendor } : {}),
        ...(filter.buyer ? { buyer: filter.buyer } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      }),
    REFRESH,
  );
}

export function useBalances(owner: PublicKey | null) {
  return useSWR(
    owner ? ["balances", owner.toBase58()] : null,
    async () => {
      if (!owner) return null;
      const conn = getConnection();
      const ata = getAssociatedTokenAddressSync(PAYMENT_MINT, owner, true);
      const [lamports, token] = await Promise.all([
        conn.getBalance(owner),
        conn.getTokenAccountBalance(ata).catch(() => null),
      ]);
      return { lamports, token: token ? BigInt(token.value.amount) : 0n };
    },
    REFRESH,
  );
}

/** Revalidates every on-chain query after a transaction lands. */
export function useRefreshAll() {
  const { mutate } = useSWRConfig();
  return () => mutate(() => true);
}
