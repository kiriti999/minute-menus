export type FoodType = "Veg" | "Non-Veg" | "Egg";

export type MenuDishRef = {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
};

export type DeliveryExportRow = {
  serialNo: number;
  category: string;
  itemName: string;
  description: string;
  price: number;
  foodType: FoodType;
  imageFileName: string;
  imageBuffer?: ArrayBuffer;
  imageExtension?: "png" | "jpeg";
};

export type DeliveryExportMeta = {
  restaurantName: string;
  currencyCode: string;
  generatedAt: Date;
  totalItems: number;
  withPhotos: number;
  missingPhotos: number;
  unmatchedUploads: string[];
};
