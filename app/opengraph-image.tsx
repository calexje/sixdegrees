import { ImageResponse } from "next/og";

export const alt =
  "Football Degrees — connect two footballers through the clubs they shared";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded card, drawn with code (no external fonts/emoji) so it generates
// offline at build. Mirrors the app palette: warm dark surface, sage accent,
// cream text.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#282828",
          color: "#e8e6e1",
          fontFamily: "sans-serif",
          padding: "80px",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          Football Degrees
        </div>
        <div
          style={{
            width: 220,
            height: 10,
            borderRadius: 6,
            background: "#7daea3",
            margin: "36px 0",
          }}
        />
        <div
          style={{
            fontSize: 40,
            color: "#bdbab7",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Connect two footballers through the clubs they
          shared.
        </div>
      </div>
    ),
    size
  );
}
