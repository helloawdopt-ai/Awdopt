import { ImageResponse } from "next/og";
import { brandAssets } from "@/lib/server/brand-assets";

export const alt = "AWDOPT: Better Matches. Better Adoptions.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const { colors: c, logo, font } = await brandAssets();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 48,
        padding: 80,
        background: c.bg,
        color: c.ink,
        fontFamily: "Unbounded",
      }}
    >
      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          padding: "28px 36px",
          background: c.surface,
          border: `6px solid ${c.ink}`,
          borderRadius: 40,
          boxShadow: `14px 14px 0 ${c.ink}`,
          transform: "rotate(-4deg)",
        }}
      >
        <img src={logo} width={480} height={154} alt="" />
      </div>
      <div style={{ fontSize: 76, lineHeight: 1.08, letterSpacing: "-0.035em", maxWidth: 980 }}>
        Better Matches. Better Adoptions.
      </div>
    </div>,
    { ...size, fonts: [{ name: "Unbounded", data: font, weight: 800, style: "normal" }] },
  );
}
