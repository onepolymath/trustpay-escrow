import type { Metadata } from "next";

import { DisputeQueue } from "./dispute-queue";

export const metadata: Metadata = { title: "Disputes" };

export default function ArbiterPage() {
  return <DisputeQueue />;
}
