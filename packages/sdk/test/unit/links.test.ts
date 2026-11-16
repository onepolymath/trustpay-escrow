import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import {
  actionApiUrl,
  blinkUrl,
  explorerUrl,
  orderPath,
  solanaPayUrl,
  vendorPath,
} from "../../src/index.js";

const v = Keypair.generate().publicKey;

describe("links", () => {
  it("builds app paths", () => {
    expect(orderPath(v, 3n)).toBe(`/o/${v.toBase58()}/3`);
    expect(vendorPath(v.toBase58())).toBe(`/v/${v.toBase58()}`);
  });

  it("builds the Actions endpoint without double slashes", () => {
    expect(actionApiUrl("https://trustpay.app/", v, 7)).toBe(
      `https://trustpay.app/api/actions/order/${v.toBase58()}/7`,
    );
  });

  it("wraps the endpoint as a Blink and a Solana Pay URI", () => {
    const api = actionApiUrl("https://trustpay.app", v, 0);
    const blink = new URL(blinkUrl(api));
    expect(blink.origin).toBe("https://dial.to");
    expect(blink.searchParams.get("action")).toBe(`solana-action:${api}`);
    expect(blink.searchParams.get("cluster")).toBe("devnet");
    expect(solanaPayUrl(api)).toBe(`solana:${encodeURIComponent(api)}`);
  });

  it("builds explorer links per cluster", () => {
    expect(explorerUrl("tx", "abc")).toBe("https://explorer.solana.com/tx/abc?cluster=devnet");
    expect(explorerUrl("address", "abc", "mainnet-beta")).toBe(
      "https://explorer.solana.com/address/abc",
    );
  });
});
