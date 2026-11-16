import { IDL } from "./idl/idl.js";

export interface ProgramErrorInfo {
  code: number;
  name: string;
  message: string;
}

const BY_CODE = new Map<number, ProgramErrorInfo>(
  IDL.errors.map((e) => [e.code, { code: e.code, name: e.name, message: e.msg }]),
);

const ANCHOR_BUILTIN: Record<number, string> = {
  2001: "This wallet is not allowed to perform this action",
  2003: "This order belongs to a different account",
  2006: "Account address mismatch",
  2012: "This wallet is not authorised for this order",
  3012: "Account has not been created yet",
};

/**
 * Extracts a human-readable program error from anything a wallet, RPC or simulator throws.
 * Returns `null` when the error did not come from this program.
 */
export function parseProgramError(err: unknown): ProgramErrorInfo | null {
  const text = collectText(err);
  const hex = /custom program error: 0x([0-9a-f]+)/i.exec(text);
  const dec = /Error Number: (\d+)/.exec(text) ?? /"Custom":\s*(\d+)/.exec(text);
  const code = hex?.[1] ? parseInt(hex[1], 16) : dec?.[1] ? Number(dec[1]) : null;
  if (code === null) return null;
  const known = BY_CODE.get(code);
  if (known) return known;
  const builtin = ANCHOR_BUILTIN[code];
  return builtin ? { code, name: "AnchorConstraint", message: builtin } : null;
}

function collectText(err: unknown): string {
  if (err === null || err === undefined) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const logs = (err as Error & { logs?: unknown }).logs;
    return [err.message, Array.isArray(logs) ? logs.join("\n") : ""].join("\n");
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "";
  }
}
