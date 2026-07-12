import type { DeliveryExportMeta, DeliveryExportRow } from "./types";
import { buildSwiggySheetRows, SWIGGY_SHEET_HEADERS } from "./swiggyFormat";

const HEADER_FILL = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FFF5DEB3" },
};

const PRICE_FILL = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FFE8F5E9" },
};

const THUMB_WIDTH = 90;
const THUMB_HEIGHT = 68;
const DATA_ROW_HEIGHT = 52;

const styleHeaderRow = (sheet: import("exceljs").Worksheet, columnCount: number): void => {
  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.font = { bold: true, size: 11 };
  for (let col = 1; col <= columnCount; col += 1) {
    const cell = headerRow.getCell(col);
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD4A574" } },
      left: { style: "thin", color: { argb: "FFD4A574" } },
      bottom: { style: "thin", color: { argb: "FFD4A574" } },
      right: { style: "thin", color: { argb: "FFD4A574" } },
    };
  }
};

const addSwiggySheet = (workbook: import("exceljs").Workbook, rows: DeliveryExportRow[]): void => {
  const sheet = workbook.addWorksheet("Swiggy");
  sheet.columns = [
    { width: 20 },
    { width: 18 },
    { width: 34 },
    { width: 40 },
    { width: 12 },
    { width: 14 },
    { width: 10 },
    { width: 16 },
    { width: 28 },
  ];

  sheet.addRow([...SWIGGY_SHEET_HEADERS]);
  styleHeaderRow(sheet, SWIGGY_SHEET_HEADERS.length);

  const swiggyRows = buildSwiggySheetRows(rows);
  swiggyRows.forEach((row, index) => {
    const sheetRow = sheet.addRow([
      row.categoryName,
      row.subCategoryName,
      row.itemName,
      row.description,
      row.price,
      row.vegEggNonveg,
      row.isSpicy,
      "",
      row.imageFileName,
    ]);
    sheetRow.height = row.imageBuffer ? DATA_ROW_HEIGHT : 20;
    sheetRow.getCell(5).fill = PRICE_FILL;
    sheetRow.alignment = { vertical: "middle", wrapText: true };

    if (row.imageBuffer && row.imageExtension) {
      const imageId = workbook.addImage({
        buffer: row.imageBuffer,
        extension: row.imageExtension,
      });
      sheet.addImage(imageId, {
        tl: { col: 7, row: index + 1 },
        ext: { width: THUMB_WIDTH, height: THUMB_HEIGHT },
      });
    }
  });
};

const addMenuSheet = (
  workbook: import("exceljs").Workbook,
  rows: DeliveryExportRow[],
  priceHeader: string,
): void => {
  const sheet = workbook.addWorksheet("Zomato");
  sheet.columns = [
    { width: 7 },
    { width: 18 },
    { width: 34 },
    { width: 14 },
    { width: 12 },
    { width: 16 },
    { width: 30 },
  ];

  sheet.addRow(["S.No", "Category", "Item Name", priceHeader, "Food Type", "Image", "Image File"]);
  styleHeaderRow(sheet, 7);

  rows.forEach((row, index) => {
    const sheetRow = sheet.addRow([
      row.serialNo,
      row.category,
      row.itemName,
      row.price,
      row.foodType,
      "",
      row.imageFileName,
    ]);
    sheetRow.height = row.imageBuffer ? DATA_ROW_HEIGHT : 20;
    sheetRow.getCell(4).fill = PRICE_FILL;
    sheetRow.alignment = { vertical: "middle", wrapText: true };

    if (row.imageBuffer && row.imageExtension) {
      const imageId = workbook.addImage({
        buffer: row.imageBuffer,
        extension: row.imageExtension,
      });
      sheet.addImage(imageId, {
        tl: { col: 5, row: index + 1 },
        ext: { width: THUMB_WIDTH, height: THUMB_HEIGHT },
      });
    }
  });
};

const addSummarySheet = (workbook: import("exceljs").Workbook, meta: DeliveryExportMeta): void => {
  const sheet = workbook.addWorksheet("Export Summary");
  sheet.columns = [{ width: 28 }, { width: 40 }];

  const rows: [string, string | number][] = [
    ["Restaurant", meta.restaurantName],
    ["Generated", meta.generatedAt.toLocaleString()],
    ["Total menu items", meta.totalItems],
    ["Items with photos", meta.withPhotos],
    ["Items missing photos", meta.missingPhotos],
    ["Unmatched uploads", meta.unmatchedUploads.length],
    ["Swiggy sheet", "All menu items with prices"],
    ["Zomato sheet", "Items with uploaded photos (when enabled)"],
  ];

  sheet.addRow(["Field", "Value"]);
  styleHeaderRow(sheet, 2);
  rows.forEach(([label, value]) => sheet.addRow([label, value]));

  if (meta.unmatchedUploads.length > 0) {
    sheet.addRow([]);
    sheet.addRow(["Unmatched file names"]);
    meta.unmatchedUploads.forEach((name) => sheet.addRow([name]));
  }
};

const addGallerySheet = (
  workbook: import("exceljs").Workbook,
  rows: DeliveryExportRow[],
): void => {
  const sheet = workbook.addWorksheet("Image Gallery");
  sheet.columns = [{ width: 30 }, { width: 18 }];
  sheet.addRow(["Image File", "Preview"]);
  styleHeaderRow(sheet, 2);

  const withImages = rows.filter((row) => row.imageBuffer && row.imageExtension);
  withImages.forEach((row, index) => {
    sheet.addRow([row.imageFileName, ""]);
    sheet.getRow(index + 2).height = DATA_ROW_HEIGHT;

    const imageId = workbook.addImage({
      buffer: row.imageBuffer!,
      extension: row.imageExtension!,
    });
    sheet.addImage(imageId, {
      tl: { col: 1, row: index + 1 },
      ext: { width: THUMB_WIDTH, height: THUMB_HEIGHT },
    });
  });
};

export const buildDeliveryMenuExcel = async (
  swiggyRows: DeliveryExportRow[],
  zomatoRows: DeliveryExportRow[],
  meta: DeliveryExportMeta,
): Promise<ArrayBuffer> => {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Minute Menus";
  workbook.created = meta.generatedAt;

  const priceHeader =
    meta.currencyCode === "INR" ? "Price (INR)" : `Price (${meta.currencyCode})`;

  addSummarySheet(workbook, meta);
  addSwiggySheet(workbook, swiggyRows);
  addMenuSheet(workbook, zomatoRows, priceHeader);
  addGallerySheet(workbook, zomatoRows);

  return workbook.xlsx.writeBuffer();
};

export const downloadExcelBuffer = (buffer: ArrayBuffer, filename: string): void => {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
