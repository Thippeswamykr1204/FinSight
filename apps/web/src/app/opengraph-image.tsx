import { ImageResponse } from "next/og";

export const alt =
  "FinSight — Money, with perspective. A calmer financial operating system.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#101b16",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 30,
          color: "#b8f2d0",
        }}
      >
        finsight
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 82, fontWeight: 700, letterSpacing: -5 }}>
          Money, with
        </div>
        <div style={{ fontSize: 90, color: "#b8f2d0", letterSpacing: -5 }}>
          perspective.
        </div>
      </div>
      <div style={{ fontSize: 24, color: "#bfd0c5" }}>
        See clearly. Plan intentionally. Move forward.
      </div>
    </div>,
    size,
  );
}
