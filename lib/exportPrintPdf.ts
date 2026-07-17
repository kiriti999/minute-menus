/**
 * Print-to-PDF export — clones the preview DOM and opens the browser print dialog.
 * Keeps the design’s pixel layout and scales it into the physical mm page so text
 * does not reflow when CSS mm ≠ design px (common print-DPI mismatch).
 */
export interface ExportPrintPdfOptions {
  previewSelector: string;
  widthMm: number;
  heightMm: number;
  title: string;
}

/** cloneNode(true) does not copy canvas pixels — inline as img for print/PDF. */
function inlineClonedCanvases(clone: HTMLElement, source: HTMLElement): void {
  const sourceCanvases = source.querySelectorAll("canvas");
  const cloneCanvases = clone.querySelectorAll("canvas");
  sourceCanvases.forEach((src, index) => {
    const dest = cloneCanvases[index];
    if (!dest || !(src instanceof HTMLCanvasElement) || !(dest instanceof HTMLCanvasElement)) return;
    try {
      const img = document.createElement("img");
      img.src = src.toDataURL("image/png");
      img.alt = "QR code";
      img.width = src.width;
      img.height = src.height;
      img.style.display = "block";
      img.style.width = dest.style.width || `${src.width}px`;
      img.style.height = dest.style.height || `${src.height}px`;
      dest.replaceWith(img);
    } catch {
      /* canvas may be tainted — leave empty */
    }
  });
}

function collectStylesheets(): string {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => {
      if (el instanceof HTMLLinkElement && el.href) {
        return `<link rel="stylesheet" href="${el.href}">`;
      }
      return el.outerHTML;
    })
    .join("\n");
}

async function waitForPrintReady(win: Window): Promise<void> {
  await new Promise<void>((resolve) => {
    if (win.document.readyState === "complete") resolve();
    else win.addEventListener("load", () => resolve(), { once: true });
    setTimeout(resolve, 1500);
  });
  try {
    await win.document.fonts.ready;
  } catch {
    /* fonts API unavailable */
  }
  await new Promise((r) => setTimeout(r, 80));
}

export async function exportPrintDesignToPdf(opts: ExportPrintPdfOptions): Promise<void> {
  const preview = document.querySelector(opts.previewSelector);
  if (!preview || !(preview instanceof HTMLElement)) return;

  try {
    await document.fonts.ready;
  } catch {
    /* ignore */
  }

  const widthPx = Math.max(1, preview.offsetWidth || preview.clientWidth);
  const heightPx = Math.max(1, preview.offsetHeight || preview.clientHeight);

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const clone = preview.cloneNode(true) as HTMLElement;
  inlineClonedCanvases(clone, preview);
  clone.style.width = `${widthPx}px`;
  clone.style.height = `${heightPx}px`;
  clone.style.maxHeight = "none";
  clone.style.overflow = "hidden";
  clone.style.position = "relative";
  clone.style.boxShadow = "none";
  clone.style.border = "none";
  clone.style.margin = "0";
  clone.style.transform = "none";

  const orientation = opts.widthMm > opts.heightMm ? "landscape" : "portrait";
  const styles = collectStylesheets();

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${opts.title}</title>
      ${styles}
      <style>
        @page { margin: 0; size: ${opts.widthMm}mm ${opts.heightMm}mm ${orientation}; }
        html, body {
          margin: 0;
          padding: 0;
          width: ${opts.widthMm}mm;
          height: ${opts.heightMm}mm;
          overflow: hidden;
        }
        .mm-print-root {
          width: ${opts.widthMm}mm;
          height: ${opts.heightMm}mm;
          overflow: hidden;
          position: relative;
        }
        .mm-print-scale {
          width: ${widthPx}px;
          height: ${heightPx}px;
          transform-origin: top left;
          transform: scale(calc(${opts.widthMm}mm / ${widthPx}px));
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="mm-print-root">
        <div class="mm-print-scale">${clone.outerHTML}</div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();

  await waitForPrintReady(printWindow);
  printWindow.print();
}
