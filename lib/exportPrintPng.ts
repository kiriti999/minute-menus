/**
 * PNG export via modern-screenshot — embeds Google Fonts as data-URLs and
 * captures at high DPR without CSS filters (CMYK preview filters blur type).
 */
import { domToCanvas } from "modern-screenshot";

export interface ExportPrintPngOptions {
  element: HTMLElement;
  backgroundColor: string;
  /** Pixel ratio — 4 recommended for print flyers. */
  scale?: number;
  /** Google Fonts css2 URL (or any @font-face stylesheet) to embed. */
  fontCssHref?: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
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

function resolveFontCssHref(explicit?: string): string | undefined {
  if (explicit?.trim()) return explicit.trim();
  const link = document.getElementById("gf-print-designs") as HTMLLinkElement | null;
  return link?.href || undefined;
}

/** Fetch CSS and inline every url(...) font file as a data-URL for reliable embed. */
async function buildEmbeddedFontCss(href?: string): Promise<string | undefined> {
  const url = resolveFontCssHref(href);
  if (!url) return undefined;
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return undefined;
    let cssText = await res.text();
    const urls = new Set<string>();
    const re = /url\((['"]?)(https?:\/\/[^)'"]+)\1\)/g;
    for (let match = re.exec(cssText); match; match = re.exec(cssText)) {
      urls.add(match[2]);
    }
    const map = new Map<string, string>();
    await Promise.all(
      [...urls].map(async (fontUrl) => {
        try {
          const fontRes = await fetch(fontUrl, { mode: "cors", credentials: "omit" });
          if (!fontRes.ok) return;
          const buf = await fontRes.arrayBuffer();
          const mime = fontRes.headers.get("content-type") || "font/woff2";
          map.set(fontUrl, `url(data:${mime};base64,${arrayBufferToBase64(buf)})`);
        } catch {
          /* skip failed face */
        }
      }),
    );
    for (const [fontUrl, dataUrl] of map) {
      cssText = cssText.split(`url(${fontUrl})`).join(dataUrl);
      cssText = cssText.split(`url('${fontUrl}')`).join(dataUrl);
      cssText = cssText.split(`url("${fontUrl}")`).join(dataUrl);
    }
    return cssText;
  } catch {
    return undefined;
  }
}

function createExportMount(width: number, height: number, backgroundColor: string): HTMLDivElement {
  const mount = document.createElement("div");
  mount.setAttribute("data-print-export-mount", "");
  // Full opacity + off-screen — low opacity causes soft/blurry rasterization.
  Object.assign(mount.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    opacity: "1",
    zIndex: "2147483646",
    pointerEvents: "none",
    overflow: "hidden",
    background: backgroundColor,
  });
  return mount;
}

function sharpenCloneText(clone: HTMLElement): void {
  // CMYK preview filters (and any other filter) softens glyphs in raster export.
  clone.style.filter = "none";
  clone.style.transform = "none";
  clone.style.margin = "0";
  clone.style.textRendering = "geometricPrecision";
  (clone.style as CSSStyleDeclaration & { webkitFontSmoothing?: string }).webkitFontSmoothing =
    "none";
  clone.querySelectorAll<HTMLElement>("*").forEach((node) => {
    if (node.style.filter) node.style.filter = "none";
    node.style.textRendering = "geometricPrecision";
    (node.style as CSSStyleDeclaration & { webkitFontSmoothing?: string }).webkitFontSmoothing =
      "none";
  });
}

export async function exportPrintDesignToPng(
  opts: ExportPrintPngOptions,
): Promise<HTMLCanvasElement> {
  const { element, backgroundColor, scale = 2, fontCssHref } = opts;
  const width = Math.max(1, element.offsetWidth);
  const height = Math.max(1, element.offsetHeight);
  const mount = createExportMount(width, height, backgroundColor);
  const clone = element.cloneNode(true) as HTMLElement;
  inlineCanvasesFromSource(element, clone);
  sharpenCloneText(clone);
  mount.appendChild(clone);
  document.body.appendChild(mount);

  try {
    const fontCssText = await buildEmbeddedFontCss(fontCssHref);
    if (fontCssText) {
      const style = document.createElement("style");
      style.textContent = fontCssText;
      mount.prepend(style);
    }
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
      style: {
        transform: "none",
        margin: "0",
        filter: "none",
        textRendering: "geometricPrecision",
      },
      ...(fontCssText ? { font: { cssText: fontCssText, preferredFormat: "woff2" } } : {}),
      fetch: {
        requestInit: { mode: "cors", credentials: "omit" },
        bypassingCache: false,
      },
    });
  } finally {
    mount.remove();
  }
}
