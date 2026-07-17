/**
 * PNG export via modern-screenshot.
 * CTA pills are rasterized with canvas fillText (middle baseline) so "Scan to order"
 * stays vertically centered — CSS line-box metrics drift in SVG foreignObject capture.
 */
import { domToCanvas } from "modern-screenshot";

export interface ExportPrintPngOptions {
  element: HTMLElement;
  backgroundColor: string;
  scale?: number;
}

async function waitTwoFrames(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForFonts(): Promise<void> {
  try {
    await document.fonts.ready;
  } catch {
    /* fonts API unavailable */
  }
}

function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  ).then(() => undefined);
}

/** cloneNode does not copy canvas pixel buffers — replace with <img> data URLs. */
function inlineCanvasesFromSource(source: HTMLElement, clone: HTMLElement): void {
  const srcCanvases = source.querySelectorAll("canvas");
  const cloneCanvases = clone.querySelectorAll("canvas");
  srcCanvases.forEach((src, i) => {
    const dest = cloneCanvases[i];
    if (!dest) return;
    try {
      const img = document.createElement("img");
      img.src = src.toDataURL("image/png");
      img.width = src.width;
      img.height = src.height;
      img.style.cssText = dest.style.cssText;
      dest.replaceWith(img);
    } catch {
      /* tainted canvas — leave as-is */
    }
  });
}

/**
 * Replace sticker CTA nodes with a canvas-drawn pill so label is truly vertically centered.
 */
function rasterizeStickerCtas(root: HTMLElement, pixelRatio = 2): void {
  root.querySelectorAll<HTMLElement>("[data-mm-sticker-cta]").forEach((el) => {
    const cs = getComputedStyle(el);
    const w = Math.max(1, Math.ceil(el.offsetWidth));
    const h = Math.max(1, Math.ceil(el.offsetHeight));
    const text = (el.textContent || "").trim();
    if (!text) return;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * pixelRatio);
    canvas.height = Math.round(h * pixelRatio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(pixelRatio, pixelRatio);
    ctx.clearRect(0, 0, w, h);

    const radius = Math.min(h / 2, Number.parseFloat(cs.borderRadius) || h / 2);
    ctx.fillStyle = cs.backgroundColor || "#000";
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.arcTo(w, 0, w, h, radius);
    ctx.arcTo(w, h, 0, h, radius);
    ctx.arcTo(0, h, 0, 0, radius);
    ctx.arcTo(0, 0, w, 0, radius);
    ctx.closePath();
    ctx.fill();

    const fontSize = Number.parseFloat(cs.fontSize) || 12;
    const fontWeight = cs.fontWeight || "700";
    const fontFamily = cs.fontFamily || "sans-serif";
    ctx.fillStyle = cs.color || "#fff";
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Optical nudge: uppercase glyphs sit slightly low with middle baseline.
    ctx.fillText(text.toUpperCase(), w / 2, h / 2 + fontSize * 0.04);

    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/png");
    img.alt = text;
    img.width = w;
    img.height = h;
    img.style.cssText = [
      "display:inline-block",
      "vertical-align:middle",
      `width:${w}px`,
      `height:${h}px`,
      "max-width:100%",
      "border-radius:999px",
    ].join(";");
    el.replaceWith(img);
  });
}

function createExportMount(width: number, height: number, backgroundColor: string): HTMLDivElement {
  const mount = document.createElement("div");
  mount.setAttribute("data-print-export-mount", "");
  Object.assign(mount.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    opacity: "0.02",
    zIndex: "2147483646",
    pointerEvents: "none",
    overflow: "hidden",
    background: backgroundColor,
  });
  return mount;
}

export async function exportPrintDesignToPng(
  opts: ExportPrintPngOptions,
): Promise<HTMLCanvasElement> {
  const { element, backgroundColor, scale = 2 } = opts;
  const width = Math.max(1, element.offsetWidth);
  const height = Math.max(1, element.offsetHeight);
  const mount = createExportMount(width, height, backgroundColor);
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.margin = "0";
  inlineCanvasesFromSource(element, clone);
  mount.appendChild(clone);
  document.body.appendChild(mount);

  try {
    await waitForFonts();
    await waitForImages(clone);
    await waitTwoFrames();
    rasterizeStickerCtas(clone, scale);
    await waitForImages(clone);
    await waitTwoFrames();

    return await domToCanvas(clone, {
      scale,
      backgroundColor,
      width,
      height,
      style: { transform: "none", margin: "0" },
    });
  } finally {
    mount.remove();
  }
}
