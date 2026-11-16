import type { Metadata } from "next";

import { VendorConsole } from "./vendor-console";

export const metadata: Metadata = { title: "Sell" };

export default function SellPage() {
  return <VendorConsole />;
}
