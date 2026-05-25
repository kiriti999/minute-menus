export const MAX_IMAGE_BYTES = 1024 * 1024; // 1MB
const MAX_EDGE_PX = 1920;
const MIN_EDGE_PX = 720;
const QUALITY_STEPS = [0.88, 0.8, 0.72, 0.64, 0.56];

const loadImage = (blob: Blob): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image for compression"));
        };
        img.src = url;
    });

const fitDimensions = (width: number, height: number, maxEdge: number) => {
    const longest = Math.max(width, height);
    if (longest <= maxEdge) return { width, height };
    const scale = maxEdge / longest;
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
};

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
    new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
    });

const encodeUnderLimit = async (
    canvas: HTMLCanvasElement,
    maxBytes: number,
): Promise<Blob | null> => {
    for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);
        if (blob && blob.size <= maxBytes) return blob;
    }
    return canvasToBlob(canvas, QUALITY_STEPS[QUALITY_STEPS.length - 1]);
};

const renderBlob = async (
    img: HTMLImageElement,
    maxEdge: number,
    maxBytes: number,
): Promise<Blob> => {
    const fitted = fitDimensions(img.naturalWidth, img.naturalHeight, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = fitted.width;
    canvas.height = fitted.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported in this browser");

    ctx.drawImage(img, 0, 0, fitted.width, fitted.height);
    const blob = await encodeUnderLimit(canvas, maxBytes);
    if (blob) return blob;

    throw new Error("Failed to compress image");
};

export const compressImageBlob = async (
    input: Blob,
    maxBytes = MAX_IMAGE_BYTES,
): Promise<Blob> => {
    if (!input.type.startsWith("image/")) return input;
    if (input.size <= maxBytes) return input;

    const img = await loadImage(input);
    let maxEdge = MAX_EDGE_PX;

    while (maxEdge >= MIN_EDGE_PX) {
        const blob = await renderBlob(img, maxEdge, maxBytes);
        if (blob.size <= maxBytes) return blob;
        maxEdge = Math.round(maxEdge * 0.85);
    }

    const blob = await renderBlob(img, MIN_EDGE_PX, maxBytes);
    if (blob.size > maxBytes) {
        throw new Error(
            `Image could not be compressed below ${Math.round(maxBytes / 1024 / 1024)}MB. Try a smaller photo.`,
        );
    }
    return blob;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to encode compressed image"));
        reader.readAsDataURL(blob);
    });

export const compressDataUrl = async (
    dataUrl: string,
    maxBytes = MAX_IMAGE_BYTES,
): Promise<string> => {
    if (!dataUrl.startsWith("data:image/")) return dataUrl;

    const comma = dataUrl.indexOf(",");
    const header = dataUrl.slice(0, comma);
    const base64 = dataUrl.slice(comma + 1);
    const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const compressed = await compressImageBlob(new Blob([bytes], { type: mime }), maxBytes);
    if (compressed.size >= bytes.length && compressed.size <= maxBytes) {
        return dataUrl;
    }
    return blobToDataUrl(compressed);
};
