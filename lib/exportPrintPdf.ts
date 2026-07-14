/**
 * Print-to-PDF export — clones the preview DOM and opens the browser print dialog.
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

export async function exportPrintDesignToPdf(opts: ExportPrintPdfOptions): Promise<void> {
  const preview = document.querySelector(opts.previewSelector);
  if (!preview || !(preview instanceof HTMLElement)) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join("\n");

  const clone = preview.cloneNode(true) as HTMLElement;
  inlineClonedCanvases(clone, preview);
  clone.style.width = `${opts.widthMm}mm`;
  clone.style.height = `${opts.heightMm}mm`;
  clone.style.maxHeight = `${opts.heightMm}mm`;
  clone.style.overflow = "hidden";
  clone.style.position = "relative";
  clone.style.boxShadow = "none";
  clone.style.border = "none";

  const orientation = opts.widthMm > opts.heightMm ? "landscape" : "portrait";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${opts.title}</title>
      ${styles}
      <style>
        @page { margin: 0; size: ${opts.widthMm}mm ${opts.heightMm}mm ${orientation}; }
        html, body { margin: 0; padding: 0; width: ${opts.widthMm}mm; height: ${opts.heightMm}mm; overflow: hidden; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>${clone.outerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();

  await new Promise<void>((resolve) => {
    printWindow.onload = () => resolve();
    setTimeout(resolve, 1000);
  });

  printWindow.print();
}
