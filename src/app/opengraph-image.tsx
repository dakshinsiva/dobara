import { ImageResponse } from "next/og";

export const alt = "Dobara, the proactive retention agent for consumer brands";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link preview for the console and the submission. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "#17201d",
        color: "#f6f5f2",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#0f766e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            <path d="M14.05 6A5 5 0 0 1 18 10" />
            <path d="M14.05 2a9 9 0 0 1 8 7.94" />
          </svg>
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Dobara</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>
          The proactive retention agent for consumer brands.
        </div>
        <div style={{ fontSize: 30, color: "#bfcbc7", lineHeight: 1.35, maxWidth: 980 }}>
          Calls your customers before they lapse, in their language. Remembers every call. Proves the lift against
          customers it never called.
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#8a948f" }}>
        <div>dobara-app.vercel.app</div>
        <div>Voice by Bolna · Calls on Plivo · Speech by Sarvam</div>
      </div>
    </div>,
    size
  );
}
