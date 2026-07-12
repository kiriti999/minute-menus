import { fileToDataUrl, loadImageSource } from "../imageEditor/canvasResize";

const blobToArrayBuffer = (blob: Blob): Promise<ArrayBuffer> =>
  blob.arrayBuffer();

export const prepareDeliveryImage = async (
  file: File,
  width: number,
  height: number,
): Promise<{ buffer: ArrayBuffer; extension: "png" | "jpeg" }> => {
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

  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mime, mime === "image/jpeg" ? 0.92 : undefined);
  });
  if (!blob) throw new Error(`Failed to prepare ${file.name}`);

  return {
    buffer: await blobToArrayBuffer(blob),
    extension: mime === "image/png" ? "png" : "jpeg",
  };
};
