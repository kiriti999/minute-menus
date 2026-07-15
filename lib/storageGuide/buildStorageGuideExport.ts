import type { IngredientStorageAdvice, StorageGuideResult } from "@minute-menus/types";

const HEADER_FILL = {
	type: "pattern" as const,
	pattern: "solid" as const,
	fgColor: { argb: "FFE8F5E9" },
};

export async function buildStorageGuideExcel(guide: StorageGuideResult): Promise<ArrayBuffer> {
	const ExcelJS = await import("exceljs");
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Minute Menus";

	const summary = workbook.addWorksheet("Summary");
	summary.columns = [{ width: 22 }, { width: 40 }];
	summary.addRow(["Restaurant", guide.restaurantName]);
	summary.addRow(["Generated", new Date(guide.generatedAt).toLocaleString("en-IN")]);
	summary.addRow(["Ingredients covered", guide.tips.length]);

	const sheet = workbook.addWorksheet("Storage Guide");
	sheet.columns = [
		{ width: 22 },
		{ width: 28 },
		{ width: 16 },
		{ width: 36 },
		{ width: 32 },
	];
	sheet.addRow(["Ingredient", "Where to store", "Shelf life", "Simple hacks", "Used in dishes"]);
	const header = sheet.getRow(1);
	header.font = { bold: true };
	for (let col = 1; col <= 5; col += 1) {
		header.getCell(col).fill = HEADER_FILL;
		header.getCell(col).alignment = { vertical: "middle", wrapText: true };
	}

	for (const tip of guide.tips) {
		const row = sheet.addRow([
			tip.ingredient,
			tip.storagePlace,
			tip.shelfLife,
			tip.simpleHacks,
			tip.usedInDishes.join(", "),
		]);
		row.alignment = { vertical: "top", wrapText: true };
	}

	const buffer = await workbook.xlsx.writeBuffer();
	return buffer as ArrayBuffer;
}

export function downloadStorageGuideExcel(buffer: ArrayBuffer, slug: string): void {
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${slug}-storage-guide.xlsx`;
	a.rel = "noopener";
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function buildStorageGuideHtml(guide: StorageGuideResult): string {
	const rows = guide.tips
		.map(
			(tip: IngredientStorageAdvice) => `
      <tr>
        <td>${escapeHtml(tip.ingredient)}</td>
        <td>${escapeHtml(tip.storagePlace)}</td>
        <td>${escapeHtml(tip.shelfLife)}</td>
        <td>${escapeHtml(tip.simpleHacks)}</td>
        <td>${escapeHtml(tip.usedInDishes.join(", "))}</td>
      </tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Storage Guide — ${escapeHtml(guide.restaurantName)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: system-ui, sans-serif; color: #111; font-size: 11px; line-height: 1.4; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #555; margin-bottom: 16px; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; text-align: left; }
  th { background: #e8f5e9; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  tr:nth-child(even) td { background: #fafafa; }
</style></head><body>
  <h1>Storage &amp; Preservation Guide</h1>
  <p class="meta">${escapeHtml(guide.restaurantName)} · Generated ${escapeHtml(new Date(guide.generatedAt).toLocaleString("en-IN"))}</p>
  <table>
    <thead><tr>
      <th>Ingredient</th><th>Where to store</th><th>Shelf life</th><th>Simple hacks</th><th>Used in dishes</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = function(){ window.focus(); window.print(); };</script>
</body></html>`;
}

/** Open blank tab immediately (must run in the click handler before any await). */
export function openStorageGuidePrintWindow(): Window {
	const win = window.open("about:blank", "_blank");
	if (!win) {
		throw new Error("Pop-up blocked — allow pop-ups for this site to export PDF");
	}
	win.document.write(
		"<!DOCTYPE html><html><head><title>Preparing storage guide…</title></head>" +
			"<body style='font-family:system-ui;padding:24px;color:#444'>Generating storage guide…</body></html>",
	);
	win.document.close();
	return win;
}

export function writeStorageGuidePdf(win: Window, guide: StorageGuideResult): void {
	win.document.open();
	win.document.write(buildStorageGuideHtml(guide));
	win.document.close();
}

/** @deprecated Prefer openStorageGuidePrintWindow + writeStorageGuidePdf (popup-safe). */
export function openStorageGuidePdf(guide: StorageGuideResult): void {
	const win = openStorageGuidePrintWindow();
	writeStorageGuidePdf(win, guide);
}
