import type { Metadata } from "next";

import { Purchases } from "./purchases";

export const metadata: Metadata = { title: "My purchases" };

export default function BuyPage() {
  return <Purchases />;
}
