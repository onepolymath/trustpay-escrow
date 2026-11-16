import { ImageResponse } from "next/og";

/** Social card + Blink icon. Rendered at the edge, no static assets needed. */
export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #052e2b 0%, #0b3b35 45%, #0f172a 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 24,
            background: "linear-gradient(135deg, #34d399, #0d9488)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 52,
          }}
        >
          ✓
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1 }}>TrustPay</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 940,
          }}
        >
          Pay social-media vendors without getting scammed.
        </div>
        <div style={{ fontSize: 30, color: "#a7f3d0" }}>
          Solana escrow · disputes · on-chain vendor reputation
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
