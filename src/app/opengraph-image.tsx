/* eslint-disable @next/next/no-img-element -- ImageResponse renders plain <img> */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "BUILD — Your learning journey, intelligently connected.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const mark = await readFile(join(process.cwd(), "public/brand/build-mark.svg"));
  const markSrc = `data:image/svg+xml;base64,${mark.toString("base64")}`;

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
          color: "#10163a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={markSrc} width={51} height={60} alt="" />
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 5 }}>BUILD</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 88, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>
          <div>Your learning journey,</div>
          <div style={{ color: "#4353f0" }}>intelligently connected.</div>
        </div>
        <div style={{ fontSize: 26, color: "#45464d", display: "flex", gap: 14 }}>
          <span>Join the waitlist</span>
          <span style={{ color: "#6a3be6" }}>•</span>
          <span>Early access</span>
        </div>
      </div>
    ),
    size,
  );
}
