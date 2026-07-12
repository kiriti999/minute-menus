import type { DeliveryExportRow, FoodType, MenuDishRef } from "./types";
import {
  buildImageFileNameForDish,
  guessFoodType,
  type UploadedImageRow,
} from "./uploadHelpers";
import { prepareDeliveryImage } from "./prepareDeliveryImage";
import { DIMENSION_PRESETS } from "../imageEditor/presets";

const deliverySize = DIMENSION_PRESETS.find((preset) => preset.id === "swiggy")!;

export type BuiltExportRows = {
  menuRows: DeliveryExportRow[];
  missingPrices: string[];
};

const prepareDishImage = async (
  assigned: UploadedImageRow | undefined,
): Promise<{ imageBuffer?: ArrayBuffer; imageExtension?: "jpeg" }> => {
  if (!assigned) return {};

  const prepared = await prepareDeliveryImage(
    assigned.file,
    deliverySize.width,
    deliverySize.height,
  );
  return { imageBuffer: prepared.buffer, imageExtension: prepared.extension };
};

export const buildExportRows = async (options: {
  dishes: MenuDishRef[];
  assignmentByDishId: Map<string, UploadedImageRow>;
  exportOnlyWithPhotos: boolean;
  defaultFoodType: FoodType;
}): Promise<BuiltExportRows> => {
  const { dishes, assignmentByDishId, exportOnlyWithPhotos, defaultFoodType } = options;

  const menuRows: DeliveryExportRow[] = [];
  const missingPrices: string[] = [];

  for (const dish of dishes) {
    const assigned = assignmentByDishId.get(dish.id);
    if (exportOnlyWithPhotos && !assigned) continue;

    const { imageBuffer, imageExtension } = await prepareDishImage(assigned);
    const price = Math.round(dish.price);
    const foodType = assigned?.foodType ?? guessFoodType(dish.name, defaultFoodType);

    if (price <= 0) missingPrices.push(dish.name);

    menuRows.push({
      serialNo: menuRows.length + 1,
      category: dish.category,
      itemName: dish.name,
      description: dish.description,
      price,
      foodType,
      imageFileName: buildImageFileNameForDish(dish.name, assigned?.file),
      imageBuffer,
      imageExtension,
    });
  }

  return { menuRows, missingPrices };
};
