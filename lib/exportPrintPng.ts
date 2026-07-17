/**
 * PNG export via html2canvas — moves the target on-screen before capture.
 * Far off-screen hosts (-99999) and CSS transforms cause text to shift in the bitmap.
 */
import html2canvas from "html2canvas";

export interface ExportPrintPngOptions {
  element: HTMLElement;
  host: HTMLElement;
  backgroundColor: string;
  scale?: number;
}

async function waitTwoFrames(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export async function exportPrintDesignToPng(opts: ExportPrintPngOptions): Promise<HTMLCanvasElement> {
  const { element, host, backgroundColor, scale = 2 } = opts;
  const prev = {
    position: host.style.position,
    left: host.style.left,
    top: host.style.top,
    opacity: host.style.opacity,
    zIndex: host.style.zIndex,
    pointerEvents: host.style.pointerEvents,
  };

  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.opacity = "0.01";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";

  try {
    try {
      await document.fonts.ready;
    } catch {
      /* fonts API unavailable */
    }
    await waitTwoFrames();

    return await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor,
      logging: false,
      width: element.offsetWidth,
      height: element.offsetHeight,
      windowWidth: element.offsetWidth,
      windowHeight: element.offsetHeight,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      onclone: (_doc, cloned) => {
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
      },
    });
  } finally {
    host.style.position = prev.position;
    host.style.left = prev.left;
    host.style.top = prev.top;
    host.style.opacity = prev.opacity;
    host.style.zIndex = prev.zIndex;
    host.style.pointerEvents = prev.pointerEvents;
  }
}
