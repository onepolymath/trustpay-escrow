/** Formats a raw token amount as a decimal string, trimming trailing zeros past 2 places. */
export function formatTokenAmount(raw: bigint, decimals: number): string {
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  let frac = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  if (frac.length < 2 && decimals >= 2) frac = frac.padEnd(2, "0");
  const wholeStr = whole.toLocaleString("en-US");
  return `${negative ? "-" : ""}${wholeStr}${frac ? `.${frac}` : ""}`;
}

/** Parses user input like "12.5" into raw base units. Throws on anything ambiguous. */
export function parseTokenAmount(input: string, decimals: number): bigint {
  const value = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error("Enter a positive number");
  const [whole = "0", frac = ""] = value.split(".");
  if (frac.length > decimals) throw new Error(`At most ${decimals} decimal places`);
  const raw = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0");
  if (raw <= 0n) throw new Error("Amount must be greater than zero");
  return raw;
}

/** "3d 4h", "45m", "30s". Shows the two largest units. */
export function formatDuration(totalSecs: number): string {
  const secs = Math.max(0, Math.floor(totalSecs));
  const units: [string, number][] = [
    ["d", 86_400],
    ["h", 3_600],
    ["m", 60],
    ["s", 1],
  ];
  const parts: string[] = [];
  let rest = secs;
  for (const [label, size] of units) {
    const n = Math.floor(rest / size);
    if (n > 0 || (label === "s" && parts.length === 0)) parts.push(`${n}${label}`);
    rest %= size;
    if (parts.length === 2) break;
  }
  return parts.join(" ");
}

export function shortenAddress(address: string, chars = 4): string {
  return address.length <= chars * 2 + 1
    ? address
    : `${address.slice(0, chars)}…${address.slice(-chars)}`;
}
