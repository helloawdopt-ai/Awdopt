import { ImageResponse } from "next/og";
import { brandAssets } from "@/lib/server/brand-assets";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const { icon } = await brandAssets();
  return new ImageResponse(<img src={icon} width={180} height={180} alt="" />, size);
}
