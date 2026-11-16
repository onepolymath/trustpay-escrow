import { describe, expect, it } from "vitest";

import { IDL, parseProgramError } from "../../src/index.js";

describe("parseProgramError", () => {
  it("decodes hex custom errors from wallet/RPC messages", () => {
    const e = new Error("failed to send transaction: custom program error: 0x1775");
    expect(parseProgramError(e)).toMatchObject({ code: 6005, name: "InvalidStatus" });
  });

  it("decodes Anchor log output", () => {
    const e = Object.assign(new Error("Simulation failed"), {
      logs: ["Program log: AnchorError ... Error Code: SelfDealing. Error Number: 6007."],
    });
    expect(parseProgramError(e)?.message).toBe("Buyer and vendor must be different wallets");
  });

  it("decodes JSON InstructionError payloads", () => {
    expect(parseProgramError({ InstructionError: [0, { Custom: 6009 }] })?.name).toBe(
      "ShipDeadlinePassed",
    );
  });

  it("maps common Anchor constraint codes to friendly text", () => {
    expect(parseProgramError("custom program error: 0x7d1")?.name).toBe("AnchorConstraint");
  });

  it("returns null for unrelated errors", () => {
    expect(parseProgramError(new Error("User rejected the request"))).toBeNull();
    expect(parseProgramError("custom program error: 0x1")).toBeNull();
    expect(parseProgramError(null)).toBeNull();
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    expect(parseProgramError(circular)).toBeNull();
  });

  it("covers every program error in the IDL", () => {
    for (const e of IDL.errors) {
      expect(parseProgramError(`custom program error: 0x${e.code.toString(16)}`)?.name).toBe(
        e.name,
      );
    }
  });
});
