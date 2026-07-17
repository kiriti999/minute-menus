/**
 * PNG export via html2canvas.
 * Clones the target into a near-visible on-screen mount so far off-screen
 * hosts and CSS transforms do not shift text in the bitmap.
 */
import html2canvas from "html2canvas";

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

function createExportMount(width: number, height: number): HTMLDivElement {
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
  });
  return mount;
}

function normalizeCloneTransforms(cloned: HTMLElement): void {
  cloned.style.transform = "none";
  cloned.querySelectorAll<HTMLElement>("[style*='transform']").forEach((node) => {
    if (node.style.transform.includes("translateX(-50%)")) {
      node.style.transform = "none";
      node.style.left = "0";
      node.style.width = "100%";
      node.style.display = "flex";
      node.style.justifyContent = "center";
    }
  });
}

export async function exportPrintDesignToPng(
  opts: ExportPrintPngOptions,
): Promise<HTMLCanvasElement> {
  const { element, backgroundColor, scale = 2 } = opts;
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const mount = createExportMount(width, height);
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  inlineCanvasesFromSource(element, clone);
  mount.appendChild(clone);
  document.body.appendChild(mount);

  try {
    await waitForFonts();
    await waitForImages(clone);
    await waitTwoFrames();

    return await html2canvas(clone, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      x: 0,
      y: 0,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      onclone: (_doc, cloned) => {
        normalizeCloneTransforms(cloned);
      },
    });
  } finally {
    mount.remove();
  }
}
