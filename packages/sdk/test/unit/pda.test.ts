import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import {
  TRUSTPAY_PROGRAM_ID,
  findConfigPda,
  findOrderPda,
  findProgramDataAddress,
  findVaultAddress,
  findVendorPda,
  u64Le,
} from "../../src/index.js";

describe("PDAs", () => {
  it("encodes u64 little-endian like Rust's to_le_bytes", () => {
    expect([...u64Le(1n)]).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
    expect([...u64Le(258n)]).toEqual([2, 1, 0, 0, 0, 0, 0, 0]);
    expect(() => u64Le(-1n)).toThrow(RangeError);
    expect(() => u64Le(2n ** 64n)).toThrow(RangeError);
  });

  it("derives the same addresses as the program's seeds", () => {
    const vendor = Keypair.generate().publicKey;
    const [cfg] = PublicKey.findProgramAddressSync([Buffer.from("config")], TRUSTPAY_PROGRAM_ID);
    expect(findConfigPda().equals(cfg)).toBe(true);
    const [vp] = PublicKey.findProgramAddressSync(
      [Buffer.from("vendor"), vendor.toBuffer()],
      TRUSTPAY_PROGRAM_ID,
    );
    expect(findVendorPda(vendor).equals(vp)).toBe(true);
    const id = Buffer.alloc(8);
    id.writeBigUInt64LE(42n);
    const [op] = PublicKey.findProgramAddressSync(
      [Buffer.from("order"), vendor.toBuffer(), id],
      TRUSTPAY_PROGRAM_ID,
    );
    expect(findOrderPda(vendor, 42n).equals(op)).toBe(true);
  });

  it("gives every order a distinct vault", () => {
    const vendor = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const a = findVaultAddress(findOrderPda(vendor, 0n), mint);
    const b = findVaultAddress(findOrderPda(vendor, 1n), mint);
    expect(a.equals(b)).toBe(false);
  });

  it("derives ProgramData under the upgradeable loader", () => {
    expect(PublicKey.isOnCurve(findProgramDataAddress().toBytes())).toBe(false);
  });
});
