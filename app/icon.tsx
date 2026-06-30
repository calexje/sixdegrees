import { ImageResponse } from "next/og";

// Browser-tab icon, drawn with code (no external assets) so it builds offline.
// "f" monogram in the dark surface on the sage accent, mirroring the OG card.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#7daea3",
          color: "#282828",
          fontFamily: "sans-serif",
          fontSize: 48,
          fontWeight: 700,
          borderRadius: 12,
        }}
      >
        f
      </div>
    ),
    size
  );
}
