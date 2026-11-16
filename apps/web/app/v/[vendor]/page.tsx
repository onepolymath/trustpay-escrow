import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { parsePublicKey } from "@/lib/params";

import { VendorProfileView } from "./vendor-profile";

export const metadata: Metadata = { title: "Vendor reputation" };

export default async function VendorPage({ params }: { params: Promise<{ vendor: string }> }) {
  const vendor = parsePublicKey((await params).vendor);
  if (!vendor) notFound();
  return <VendorProfileView vendor={vendor.toBase58()} />;
}
