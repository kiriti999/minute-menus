/**
 * PNG export via modern-screenshot — embeds Google Fonts as data-URLs and
 * captures at high DPR without CSS filters (CMYK preview filters blur type).
 *
 * Large wall boards (e.g. 72×23" @ 300 DPI) exceed browser canvas limits and
 * produce empty/corrupt PNGs — scale is clamped to a safe pixel budget.
 */
import { domToCanvas } from "modern-screenshot";

export interface ExportPrintPngOptions {
  element: HTMLElement;
  backgroundColor: string;
  /** Pixel ratio — reduced automatically for huge boards. */
  scale?: number;
  /** Google Fonts css2 URL (or any @font-face stylesheet) to embed. */
  fontCssHref?: string;
  /** Family tokens from googleFontsForCustomization (e.g. Inter:400,600,700). */
  fontFamilies?: string[];
}

/** Browsers often fail past ~16k on an edge or ~268M pixels; stay under. */
const MAX_CANVAS_EDGE = 8192;
const MAX_CANVAS_PIXELS = 64 * 1024 * 1024; // 64MP

/** Scale that keeps width×scale and height×scale within canvas limits. */
export function safePngExportScale(
  widthPx: number,
  heightPx: number,
  requestedScale = 2,
): number {
  const w = Math.max(1, widthPx);
  const h = Math.max(1, heightPx);
  const byEdge = Math.min(MAX_CANVAS_EDGE / w, MAX_CANVAS_EDGE / h);
  const byArea = Math.sqrt(MAX_CANVAS_PIXELS / (w * h));
  return Math.max(0.2, Math.min(requestedScale, byEdge, byArea));
}

/** DPI so the longer edge stays ≤ maxEdge (default 8192px). */
export function exportDpiForFormat(widthMm: number, heightMm: number, maxEdge = MAX_CANVAS_EDGE): number {
  const w300 = (widthMm * 300) / 25.4;
  const h300 = (heightMm * 300) / 25.4;
  const fit = Math.min(1, maxEdge / Math.max(w300, h300));
  return Math.max(96, Math.min(300, Math.floor(300 * fit)));
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

/** Force-load weights used in print layouts so canvas capture does not fall back to serif. */
async function preloadExportFonts(families: string[]): Promise<void> {
  await waitForFonts();
  if (!families.length || typeof document.fonts?.load !== "function") return;
  const weights = ["400", "500", "600", "700"];
  await Promise.all(
    families.flatMap((family) => {
      const name = family.replace(/\+/g, " ").split(":")[0]?.trim();
      if (!name) return [];
      return weights.map((w) =>
        document.fonts.load(`${w} 64px "${name}"`).catch(() => undefined),
      );
    }),
  );
  await waitForFonts();
}

/** Quote multi-word font names so capture engines resolve the embedded faces. */
function quoteInlineFontFamilies(root: HTMLElement): void {
  const fix = (el: HTMLElement) => {
    const ff = el.style.fontFamily;
    if (!ff || ff.includes('"') || ff.includes("'")) return;
    el.style.fontFamily = ff
      .split(",")
      .map((part) => {
        const p = part.trim();
        if (!p || p === "sans-serif" || p === "serif" || p === "monospace" || p === "system-ui") {
          return p;
        }
        return `"${p.replace(/"/g, "")}"`;
      })
      .join(", ");
  };
  fix(root);
  root.querySelectorAll<HTMLElement>("*").forEach(fix);
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
    // Google CSS may use https: or protocol-relative //fonts.gstatic.com urls.
    const re = /url\((['"]?)((?:https?:)?\/\/[^)'"]+)\1\)/g;
    for (let match = re.exec(cssText); match; match = re.exec(cssText)) {
      const raw = match[2];
      urls.add(raw.startsWith("//") ? `https:${raw}` : raw);
    }
    const map = new Map<string, string>();
    await Promise.all(
      [...urls].map(async (fontUrl) => {
        try {
          const fontRes = await fetch(fontUrl, { mode: "cors", credentials: "omit" });
          if (!fontRes.ok) return;
          const buf = await fontRes.arrayBuffer();
          const mime = fontRes.headers.get("content-type") || "font/woff2";
          const dataUrl = `url(data:${mime};base64,${arrayBufferToBase64(buf)})`;
          map.set(fontUrl, dataUrl);
          if (fontUrl.startsWith("https://")) {
            map.set(fontUrl.replace("https:", ""), dataUrl);
          }
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

/** Strip preview-only guides (die-cut dashed circle, etc.) before capture. */
function stripPrintGuides(root: HTMLElement): void {
  root.querySelectorAll("[data-print-guide]").forEach((node) => node.remove());
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
  const {
    element,
    backgroundColor,
    scale: requestedScale = 2,
    fontCssHref,
    fontFamilies = [],
  } = opts;
  const width = Math.max(1, element.offsetWidth || element.clientWidth);
  const height = Math.max(1, element.offsetHeight || element.clientHeight);
  const scale = safePngExportScale(width, height, requestedScale);
  const mount = createExportMount(width, height, backgroundColor);
  const clone = element.cloneNode(true) as HTMLElement;
  stripPrintGuides(clone);
  inlineCanvasesFromSource(element, clone);
  sharpenCloneText(clone);
  quoteInlineFontFamilies(clone);
  mount.appendChild(clone);
  document.body.appendChild(mount);

  let headFontStyle: HTMLStyleElement | null = null;
  try {
    const fontCssText = await buildEmbeddedFontCss(fontCssHref);
    if (fontCssText) {
      // Register @font-face on document so FontFaceSet + modern-screenshot both see faces.
      headFontStyle = document.createElement("style");
      headFontStyle.setAttribute("data-print-export-fonts", "");
      headFontStyle.textContent = fontCssText;
      document.head.appendChild(headFontStyle);
      const mountStyle = document.createElement("style");
      mountStyle.textContent = fontCssText;
      mount.prepend(mountStyle);
    }
    await preloadExportFonts(fontFamilies);
    await waitForImages(clone);
    await waitTwoFrames();
    rasterizeStickerCtas(clone, Math.max(1, Math.round(scale)));
    await waitForImages(clone);
    await waitTwoFrames();

    const canvas = await domToCanvas(clone, {
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

    if (!canvas.width || !canvas.height) {
      throw new Error("Export canvas was empty — try a smaller format or PDF.");
    }
    return canvas;
  } finally {
    headFontStyle?.remove();
    mount.remove();
  }
}
