/* eslint-disable @next/next/no-img-element -- ImageResponse renders plain <img> */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the full-colour mark on white (iOS rounds the corners itself). */
export default async function AppleIcon() {
  const mark = await readFile(join(process.cwd(), "public/brand/build-mark.svg"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        <img src={`data:image/svg+xml;base64,${mark.toString("base64")}`} width={100} height={117} alt="" />
      </div>
    ),
    size,
  );
}
