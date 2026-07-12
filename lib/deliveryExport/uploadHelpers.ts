import type { Category } from "@minute-menus/types";
import type { FoodType, MenuDishRef } from "./types";
import { matchDishIdFromFile } from "./matchImageToDish";

export type UploadedImageRow = {
  id: string;
  file: File;
  previewUrl: string;
  relativePath: string;
  dishId: string | null;
  foodType: FoodType;
};

export const flattenMenuDishes = (menuItems: Category[]): MenuDishRef[] =>
  menuItems.flatMap((category) =>
    category.items.map((dish) => ({
      id: dish.id,
      category: category.title,
      name: dish.name,
      description: dish.description ?? "",
      price: dish.price,
    })),
  );

export const isImageFile = (file: File): boolean => file.type.startsWith("image/");

export const createUploadedImageRow = (
  file: File,
  dishes: MenuDishRef[],
  defaultFoodType: FoodType,
  relativePath = file.name,
): UploadedImageRow => ({
  id: `${relativePath}-${file.size}-${file.lastModified}`,
  file,
  previewUrl: URL.createObjectURL(file),
  relativePath,
  dishId: matchDishIdFromFile(file.name, relativePath, dishes),
  foodType: defaultFoodType,
});

export const mergeUploadedImages = (
  current: UploadedImageRow[],
  incoming: UploadedImageRow[],
): UploadedImageRow[] => {
  const byId = new Map(current.map((row) => [row.id, row]));
  for (const row of incoming) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
};

export const revokeUploadedPreviews = (rows: UploadedImageRow[]): void => {
  for (const row of rows) {
    URL.revokeObjectURL(row.previewUrl);
  }
};

export const buildImageFileNameForDish = (dishName: string, assignedFile?: File): string => {
  if (assignedFile) {
    const base = assignedFile.name.replace(/\.[^.]+$/, "").trim();
    if (base) return `${base}.jpg`;
  }
  return `${dishName.trim()}.jpg`;
};

export const guessFoodType = (dishName: string, defaultFoodType: FoodType): FoodType => {
  const lower = dishName.toLowerCase();
  if (/\b(chicken|mutton|fish|tuna|prawn|egg|meat|beef|pork)\b/.test(lower)) {
    if (/\begg\b/.test(lower) && !/\b(chicken|mutton|fish|meat)\b/.test(lower)) return "Egg";
    return "Non-Veg";
  }
  return defaultFoodType;
};
