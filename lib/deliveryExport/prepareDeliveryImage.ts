import { fileToDataUrl, loadImageSource } from "../imageEditor/canvasResize";

/** Target size per export image — keeps Excel/PDF lean while preserving detail at 1600×1200. */
export const EXPORT_IMAGE_MAX_BYTES = 450 * 1024;

const JPEG_QUALITY_STEPS = [0.88, 0.82, 0.76, 0.7, 0.64, 0.58];

const blobToArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => blob.arrayBuffer();

const canvasToJpeg = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });

const encodeJpegUnderLimit = async (
  canvas: HTMLCanvasElement,
  maxBytes: number,
): Promise<Blob> => {
  let bestBlob: Blob | null = null;

  for (const quality of JPEG_QUALITY_STEPS) {
    const blob = await canvasToJpeg(canvas, quality);
    if (!blob) continue;
    bestBlob = blob;
    if (blob.size <= maxBytes) return blob;
  }

  if (bestBlob) return bestBlob;
  throw new Error("Failed to encode export image");
};

export const prepareDeliveryImage = async (
  file: File,
  width: number,
  height: number,
  maxBytes = EXPORT_IMAGE_MAX_BYTES,
): Promise<{ buffer: ArrayBuffer; extension: "jpeg" }> => {
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImageSource(dataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");

  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);

  const blob = await encodeJpegUnderLimit(canvas, maxBytes);
  if (!blob) throw new Error(`Failed to prepare ${file.name}`);

  return {
    buffer: await blobToArrayBuffer(blob),
    extension: "jpeg",
  };
};
