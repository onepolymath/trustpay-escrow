import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { parseOrderParams } from "@/lib/params";

import { OrderView } from "./order-view";

interface Props {
  params: Promise<{ vendor: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Order #${id}`,
    description: "Pay safely with TrustPay: your money stays in escrow until you confirm delivery.",
  };
}

export default async function OrderPage({ params }: Props) {
  const parsed = parseOrderParams(await params);
  if (!parsed) notFound();
  return <OrderView vendor={parsed.vendor.toBase58()} orderId={parsed.orderId.toString()} />;
}
