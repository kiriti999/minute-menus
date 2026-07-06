/**
 * Print-to-PDF export — clones the preview DOM and opens the browser print dialog.
 * Same approach as WhatsNxt resume builder (vector-friendly, no canvas rasterization).
 */
export interface ExportPrintPdfOptions {
  previewSelector: string;
  widthMm: number;
  heightMm: number;
  title: string;
}

export async function exportPrintDesignToPdf(opts: ExportPrintPdfOptions): Promise<void> {
  const preview = document.querySelector(opts.previewSelector);
  if (!preview) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  const clone = preview.cloneNode(true) as HTMLElement;
  clone.style.width = `${opts.widthMm}mm`;
  clone.style.height = `${opts.heightMm}mm`;
  clone.style.maxHeight = `${opts.heightMm}mm`;
  clone.style.overflow = 'hidden';
  clone.style.position = 'relative';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';

  const orientation = opts.widthMm > opts.heightMm ? 'landscape' : 'portrait';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${opts.title}</title>
      ${styles}
      <style>
        @page { margin: 0; size: ${opts.widthMm}mm ${opts.heightMm}mm ${orientation}; }
        body { margin: 0; padding: 0; }
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
