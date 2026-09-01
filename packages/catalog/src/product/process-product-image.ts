import {
  processRasterToWebpCropped,
  type ProcessedRasterImage,
} from "../media/process-raster-image";
import { PRODUCT_IMAGE_SPECS, type ProductImageSlot } from "./image-specs";

export async function processProductImageUpload(
  input: Buffer,
  slot: ProductImageSlot,
): Promise<ProcessedRasterImage> {
  const spec = PRODUCT_IMAGE_SPECS[slot];
  return processRasterToWebpCropped(input, { width: spec.width, height: spec.height });
}
