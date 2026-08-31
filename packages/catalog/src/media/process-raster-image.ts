import sharp from "sharp";

export const RASTER_ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const RASTER_MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const RASTER_MAX_WIDTH = 1600;
export const RASTER_WEBP_QUALITY = 82;

export type ProcessedRasterImage = {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: "image/webp";
  sizeBytes: number;
};

function isAllowedInputFormat(format: string | undefined): boolean {
  return format === "jpeg" || format === "png" || format === "webp";
}

/** Normalize marketing raster uploads: EXIF rotate, strip metadata, resize, WebP. */
export async function processRasterToWebp(input: Buffer): Promise<ProcessedRasterImage> {
  const base = sharp(input, { failOn: "error" }).rotate();
  const metadata = await base.metadata();

  if (metadata.format === "gif") {
    throw new Error("GIF is not supported. Use JPG, PNG, or WebP.");
  }
  if (!isAllowedInputFormat(metadata.format)) {
    throw new Error("Unsupported image type. Use JPG, PNG, or WebP.");
  }

  const { data, info } = await base
    .resize({
      width: RASTER_MAX_WIDTH,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: RASTER_WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    mimeType: "image/webp",
    sizeBytes: data.byteLength,
  };
}

export function isRasterImageMime(mimeType: string): boolean {
  return (RASTER_ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType);
}
