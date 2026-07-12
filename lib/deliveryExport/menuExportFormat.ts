import type { DeliveryExportRow } from "./types";

export const isSpicyItem = (name: string, description: string): 0 | 1 => {
  const text = `${name} ${description}`.toLowerCase();
  return /\b(spicy|chilli|chili|hot|pepper|masala)\b/.test(text) ? 1 : 0;
};

export const MENU_SHEET_HEADERS = [
  "S.No",
  "Category",
  "Item Name",
  "Description",
  "Price",
  "Food Type",
  "Is_spicy",
  "Image",
  "Image File",
] as const;
