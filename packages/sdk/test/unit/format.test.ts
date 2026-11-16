import { describe, expect, it } from "vitest";

import {
  formatDuration,
  formatTokenAmount,
  parseTokenAmount,
  shortenAddress,
} from "../../src/index.js";

describe("formatTokenAmount", () => {
  it.each([
    [0n, "0.00"],
    [1n, "0.000001"],
    [25_000_000n, "25.00"],
    [25_500_000n, "25.50"],
    [1_234_567_890_000n, "1,234,567.89"],
    [-1_500_000n, "-1.50"],
  ])("%s → %s", (raw, expected) => {
    expect(formatTokenAmount(raw, 6)).toBe(expected);
  });

  it("handles zero-decimal mints", () => {
    expect(formatTokenAmount(42n, 0)).toBe("42");
  });
});

describe("parseTokenAmount", () => {
  it("parses decimal input exactly (no floating point)", () => {
    expect(parseTokenAmount("12.5", 6)).toBe(12_500_000n);
    expect(parseTokenAmount(" 1,000 ", 6)).toBe(1_000_000_000n);
    expect(parseTokenAmount("0.000001", 6)).toBe(1n);
    expect(parseTokenAmount("7", 0)).toBe(7n);
  });

  it.each([["abc"], ["-1"], ["1e5"], [""], ["1.2.3"]])("rejects %j", (input) => {
    expect(() => parseTokenAmount(input, 6)).toThrow("Enter a positive number");
  });

  it("rejects too many decimals and zero", () => {
    expect(() => parseTokenAmount("1.0000001", 6)).toThrow("At most 6 decimal places");
    expect(() => parseTokenAmount("0", 6)).toThrow("greater than zero");
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0s"],
    [45, "45s"],
    [90, "1m 30s"],
    [3_600, "1h"],
    [90_061, "1d 1h"],
    [-5, "0s"],
  ])("%s → %s", (secs, expected) => {
    expect(formatDuration(secs)).toBe(expected);
  });
});

describe("shortenAddress", () => {
  it("keeps short strings and trims long ones", () => {
    expect(shortenAddress("abc")).toBe("abc");
    expect(shortenAddress("CvbRGAvMeDB3Up6fYa4xBX2GVdYdRKCpq4L5FLaThRBg")).toBe("CvbR…hRBg");
  });
});
