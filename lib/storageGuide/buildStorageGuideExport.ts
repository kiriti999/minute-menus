import type { IngredientStorageAdvice, StorageGuideResult } from "@minute-menus/types";

const FRIDGE_TEMP_NOTE =
	"COLD BAIN MARIE (UNDER FRIDGE) TEMPERATURE MUST ALWAYS BE BETWEEN 1°C AND 4°C. TEMPERATURE OVER 4°C WILL DAMAGE OR SPOIL THE FOOD.";

const HEADER_FILL = {
	type: "pattern" as const,
	pattern: "solid" as const,
	fgColor: { argb: "FFE8F5E9" },
};

const CATEGORY_ORDER = [
	"Vegetables",
	"Fruits",
	"Herbs",
	"Dairy",
	"Proteins",
	"Grains & staples",
	"Spices & condiments",
	"Oils & fats",
	"Other",
];

const categorySortIndex = (category: string): number => {
	const idx = CATEGORY_ORDER.findIndex((c) => c.toLowerCase() === category.trim().toLowerCase());
	return idx === -1 ? CATEGORY_ORDER.length : idx;
};

const storagePlaceSortIndex = (place: string): number => {
	const t = place.trim().toLowerCase();
	if (/bain|marie|fridge|refrigerat|chill/.test(t) && !/freezer|ice.?cream/.test(t)) return 0;
	if (/freezer|ice.?cream|frozen/.test(t)) return 1;
	if (/rack|outside|wooden|counter|pantry|shelf/.test(t)) return 2;
	return 3;
};

export function groupTipsByCategory(
	tips: IngredientStorageAdvice[],
): Array<{ category: string; tips: IngredientStorageAdvice[] }> {
	const map = new Map<string, IngredientStorageAdvice[]>();
	for (const tip of tips) {
		const key = tip.category?.trim() || "Other";
		const list = map.get(key) ?? [];
		list.push(tip);
		map.set(key, list);
	}
	return [...map.entries()]
		.sort(([a], [b]) => categorySortIndex(a) - categorySortIndex(b) || a.localeCompare(b))
		.map(([category, groupTips]) => ({
			category,
			tips: groupTips.sort(
				(x, y) =>
					storagePlaceSortIndex(x.storagePlace) - storagePlaceSortIndex(y.storagePlace) ||
					x.ingredient.localeCompare(y.ingredient),
			),
		}));
}

export async function buildStorageGuideExcel(guide: StorageGuideResult): Promise<ArrayBuffer> {
	const ExcelJS = await import("exceljs");
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Minute Menus";

	const summary = workbook.addWorksheet("Summary");
	summary.columns = [{ width: 22 }, { width: 72 }];
	const noteRow = summary.addRow(["IMPORTANT", FRIDGE_TEMP_NOTE]);
	noteRow.font = { bold: true };
	noteRow.getCell(2).alignment = { wrapText: true };
	noteRow.getCell(2).font = { bold: true, color: { argb: "FFB71C1C" } };
	summary.addRow([]);
	summary.addRow(["Restaurant", guide.restaurantName]);
	summary.addRow(["Generated", new Date(guide.generatedAt).toLocaleString("en-IN")]);
	summary.addRow(["Ingredients covered", guide.tips.length]);
	summary.addRow([
		"Storage options",
		"Cold bain marie (under fridge) · Freezer (ice cream) · Outside wooden racks",
	]);

	const sheet = workbook.addWorksheet("Storage Guide");
	sheet.columns = [
		{ width: 18 },
		{ width: 22 },
		{ width: 22 },
		{ width: 16 },
		{ width: 36 },
		{ width: 32 },
	];
	sheet.mergeCells("A1:F1");
	const banner = sheet.getRow(1);
	banner.getCell(1).value = FRIDGE_TEMP_NOTE;
	banner.getCell(1).font = { bold: true, size: 11, color: { argb: "FFB71C1C" } };
	banner.getCell(1).alignment = { wrapText: true, vertical: "middle" };
	banner.height = 36;
	sheet.addRow([]);
	sheet.addRow(["Category", "Ingredient", "Where to store", "Shelf life", "Simple hacks", "Used in dishes"]);
	const header = sheet.getRow(3);
	header.font = { bold: true };
	for (let col = 1; col <= 6; col += 1) {
		header.getCell(col).fill = HEADER_FILL;
		header.getCell(col).alignment = { vertical: "middle", wrapText: true };
	}

	for (const group of groupTipsByCategory(guide.tips)) {
		for (const tip of group.tips) {
			const row = sheet.addRow([
				group.category,
				tip.ingredient,
				tip.storagePlace,
				tip.shelfLife,
				tip.simpleHacks,
				tip.usedInDishes.join(", "),
			]);
			row.alignment = { vertical: "top", wrapText: true };
		}
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
	const sections = groupTipsByCategory(guide.tips)
		.map((group) => {
			const byPlace = new Map<string, IngredientStorageAdvice[]>();
			for (const tip of group.tips) {
				const place = tip.storagePlace?.trim() || "Cold bain marie (under fridge)";
				const list = byPlace.get(place) ?? [];
				list.push(tip);
				byPlace.set(place, list);
			}
			const placeBlocks = [...byPlace.entries()]
				.sort(([a], [b]) => storagePlaceSortIndex(a) - storagePlaceSortIndex(b))
				.map(([place, placeTips]) => {
					const rows = placeTips
						.map(
							(tip) => `
      <tr>
        <td>${escapeHtml(tip.ingredient)}</td>
        <td>${escapeHtml(tip.shelfLife)}</td>
        <td>${escapeHtml(tip.simpleHacks)}</td>
        <td>${escapeHtml(tip.usedInDishes.join(", "))}</td>
      </tr>`,
						)
						.join("");
					return `
  <h3>${escapeHtml(place)}</h3>
  <table>
    <thead><tr>
      <th>Ingredient</th><th>Shelf life</th><th>Simple hacks</th><th>Used in dishes</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
				})
				.join("");
			return `
  <h2>${escapeHtml(group.category)}</h2>
  ${placeBlocks}`;
		})
		.join("");

	return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Storage Guide — ${escapeHtml(guide.restaurantName)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: system-ui, sans-serif; color: #111; font-size: 11px; line-height: 1.4; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 18px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #2e7d32; color: #1b5e20; text-transform: uppercase; letter-spacing: 0.04em; }
  h3 { font-size: 11px; margin: 10px 0 6px; color: #374151; font-weight: 700; }
  .meta { color: #555; margin-bottom: 12px; font-size: 10px; }
  .temp-note {
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #b71c1c;
    border: 2px solid #b71c1c;
    background: #ffebee;
    padding: 10px 12px;
    margin: 0 0 16px;
    font-size: 11px;
    line-height: 1.35;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; text-align: left; }
  th { background: #e8f5e9; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  tr:nth-child(even) td { background: #fafafa; }
</style></head><body>
  <h1>Storage &amp; Preservation Guide</h1>
  <p class="meta">${escapeHtml(guide.restaurantName)} · Generated ${escapeHtml(new Date(guide.generatedAt).toLocaleString("en-IN"))} · Cold bain marie, ice cream freezer, or outside wooden racks</p>
  <p class="temp-note">${escapeHtml(FRIDGE_TEMP_NOTE)}</p>
  ${sections}
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
