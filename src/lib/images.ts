import { PHOTO_WIDTHS, type PhotoMeta } from "@/lib/listing";

export type ProcessedPhoto = PhotoMeta & { blobs: Blob[]; preview: string };

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT = 25 * 1024 * 1024;

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

// Safari returns PNG when asked for an encoder it lacks, so probe once and fall back to JPEG.
let format: Promise<PhotoMeta["ext"]> | undefined;
const pickFormat = () =>
  (format ??= encode(Object.assign(document.createElement("canvas"), { width: 1, height: 1 }), "image/webp", 0.8).then(
    (b) => (b?.type === "image/webp" ? "webp" : "jpg"),
  ));

/**
 * Resizes one photo to 480/960/1600px wide (never upscaled). Drawing to a canvas and re-encoding
 * drops all metadata (EXIF, GPS); createImageBitmap applies the EXIF orientation first.
 */
export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Use a JPG, PNG or WebP photo.");
  if (file.size > MAX_INPUT) throw new Error("That photo is over 25MB. Try a smaller one.");
  const ext = await pickFormat();
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("We couldn't read that photo. Try another one.");
  });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const blobs: Blob[] = [];
  for (const target of PHOTO_WIDTHS) {
    canvas.width = Math.min(target, bitmap.width);
    canvas.height = Math.round((bitmap.height * canvas.width) / bitmap.width);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await encode(canvas, ext === "webp" ? "image/webp" : "image/jpeg", ext === "webp" ? 0.82 : 0.85);
    if (!blob) throw new Error("We couldn't process that photo. Try another one.");
    blobs.push(blob);
  }
  bitmap.close();
  return { blobs, width: canvas.width, height: canvas.height, ext, preview: URL.createObjectURL(blobs[0]!) };
}
