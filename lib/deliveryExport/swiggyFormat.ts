import type { DeliveryExportRow, FoodType } from "./types";

export type SwiggySheetRow = {
  categoryName: string;
  subCategoryName: string;
  itemName: string;
  description: string;
  price: number;
  vegEggNonveg: string;
  isSpicy: 0 | 1;
  imageFileName: string;
  imageBuffer?: ArrayBuffer;
  imageExtension?: "png" | "jpeg";
};

export const toSwiggyFoodType = (foodType: FoodType): string => {
  if (foodType === "Non-Veg") return "non veg";
  if (foodType === "Egg") return "egg";
  return "veg";
};

export const toSwiggyItemName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

export const isSpicyItem = (name: string, description: string): 0 | 1 => {
  const text = `${name} ${description}`.toLowerCase();
  return /\b(spicy|chilli|chili|hot|pepper|masala)\b/.test(text) ? 1 : 0;
};

export const buildSwiggySheetRows = (rows: DeliveryExportRow[]): SwiggySheetRow[] => {
  let previousCategory = "";

  return rows.map((row) => {
    const showCategory = row.category !== previousCategory;
    if (showCategory) previousCategory = row.category;

    return {
      categoryName: showCategory ? row.category : "",
      subCategoryName: "",
      itemName: toSwiggyItemName(row.itemName),
      description: row.description.trim(),
      price: row.price,
      vegEggNonveg: toSwiggyFoodType(row.foodType),
      isSpicy: isSpicyItem(row.itemName, row.description),
      imageFileName: row.imageFileName,
      imageBuffer: row.imageBuffer,
      imageExtension: row.imageExtension,
    };
  });
};

export const SWIGGY_SHEET_HEADERS = [
  "Menu category name",
  "Sub category name",
  "Name of the Item",
  "Description",
  "Price",
  "Veg_egg_nonveg",
  "Is_spicy",
  "Image",
  "Image File",
] as const;
