export type CropTransform = {
  panX: number;
  panY: number;
  scale: number;
};

export const DEFAULT_CROP_TRANSFORM: CropTransform = {
  panX: 0,
  panY: 0,
  scale: 1,
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to encode image"));
    reader.readAsDataURL(blob);
  });

export const loadImageSource = async (src: string): Promise<HTMLImageElement> => {
  if (src.startsWith("data:")) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = src;
    });
  }

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Could not load image (${response.status}). Try uploading the file instead.`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to decode image. Try uploading the file instead."));
    };
    img.src = objectUrl;
  });
};

export const renderCroppedImage = async (
  img: HTMLImageElement,
  outputWidth: number,
  outputHeight: number,
  previewWidth: number,
  previewHeight: number,
  transform: CropTransform,
  mime: "image/png" | "image/webp" = "image/png",
): Promise<string> => {
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");

  const imageWidth = img.naturalWidth;
  const imageHeight = img.naturalHeight;
  const coverScale =
    Math.max(previewWidth / imageWidth, previewHeight / imageHeight) * transform.scale;
  const offsetX = previewWidth / 2 - (imageWidth * coverScale) / 2 + transform.panX;
  const offsetY = previewHeight / 2 - (imageHeight * coverScale) / 2 + transform.panY;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  const srcX = -offsetX / coverScale;
  const srcY = -offsetY / coverScale;
  const srcW = previewWidth / coverScale;
  const srcH = previewHeight / coverScale;

  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputWidth, outputHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mime, mime === "image/webp" ? 0.92 : undefined);
  });
  if (!blob) throw new Error("Failed to export image");

  return blobToDataUrl(blob);
};

export const downloadDataUrl = (dataUrl: string, filename: string): void => {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
};

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file (JPEG, PNG, or WebP)."));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export const resizeDataUrlMaxEdge = async (dataUrl: string, maxEdge: number): Promise<string> => {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;

  const img = await loadImageSource(dataUrl);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (longest <= maxEdge) return dataUrl;

  const scale = maxEdge / longest;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");

  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.9);
  });
  if (!blob) throw new Error("Failed to resize image");

  return blobToDataUrl(blob);
};
