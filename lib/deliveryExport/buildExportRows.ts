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
  swiggyRows: DeliveryExportRow[];
  zomatoRows: DeliveryExportRow[];
  missingPrices: string[];
};

const prepareDishImage = async (
  assigned: UploadedImageRow | undefined,
): Promise<{ imageBuffer?: ArrayBuffer; imageExtension?: "png" | "jpeg" }> => {
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

  const swiggyRows: DeliveryExportRow[] = [];
  const zomatoRows: DeliveryExportRow[] = [];
  const missingPrices: string[] = [];
  let zomatoSerial = 0;

  for (const dish of dishes) {
    const assigned = assignmentByDishId.get(dish.id);
    const { imageBuffer, imageExtension } = await prepareDishImage(assigned);
    const price = Math.round(dish.price);
    const foodType = assigned?.foodType ?? guessFoodType(dish.name, defaultFoodType);

    if (price <= 0) missingPrices.push(dish.name);

    const baseRow: Omit<DeliveryExportRow, "serialNo"> = {
      category: dish.category,
      itemName: dish.name,
      description: dish.description,
      price,
      foodType,
      imageFileName: buildImageFileNameForDish(dish.name, assigned?.file),
      imageBuffer,
      imageExtension,
    };

    swiggyRows.push({ ...baseRow, serialNo: swiggyRows.length + 1 });

    if (!exportOnlyWithPhotos || assigned) {
      zomatoSerial += 1;
      zomatoRows.push({ ...baseRow, serialNo: zomatoSerial });
    }
  }

  return { swiggyRows, zomatoRows, missingPrices };
};
