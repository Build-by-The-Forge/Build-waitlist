import { ImageResponse } from "next/og";

export const alt = "BUILD — Your learning journey, intelligently connected.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SPARK =
  "M12 1.5c.5 4.9 2.2 7.8 4.6 9.1 1.4.7 3.2 1.1 5.9 1.4-2.7.3-4.5.7-5.9 1.4-2.4 1.3-4.1 4.2-4.6 9.1-.5-4.9-2.2-7.8-4.6-9.1C6 12.7 4.2 12.3 1.5 12c2.7-.3 4.5-.7 5.9-1.4C9.8 9.3 11.5 6.4 12 1.5Z";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#f6f5f1",
          color: "#0f1013",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#0f1013",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24">
              <path d={SPARK} fill="#e8572a" />
            </svg>
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 4 }}>BUILD</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 88, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>
          <div>Your learning journey,</div>
          <div style={{ color: "#e8572a" }}>intelligently connected.</div>
        </div>
        <div style={{ fontSize: 26, color: "#45464d" }}>Join the waitlist · Early access</div>
      </div>
    ),
    size,
  );
}
