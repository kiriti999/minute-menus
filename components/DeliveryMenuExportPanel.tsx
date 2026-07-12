import { getErrorMessage } from "@minute-menus/errors";
import type { Category } from "@minute-menus/types";
import { InlineLoader } from "@minute-menus/ui";
import { Download, FileSpreadsheet, FolderOpen, Loader2, Upload, X } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildDeliveryMenuExcel,
  downloadExcelBuffer,
} from "../lib/deliveryExport/buildDeliveryMenuExcel";
import { prepareDeliveryImage } from "../lib/deliveryExport/prepareDeliveryImage";
import type { DeliveryExportRow, FoodType } from "../lib/deliveryExport/types";
import {
  buildImageFileNameForDish,
  createUploadedImageRow,
  flattenMenuDishes,
  guessFoodType,
  isImageFile,
  mergeUploadedImages,
  revokeUploadedPreviews,
  type UploadedImageRow,
} from "../lib/deliveryExport/uploadHelpers";
import { DIMENSION_PRESETS } from "../lib/imageEditor/presets";

export interface DeliveryMenuExportPanelProps {
  menuItems: Category[];
  restaurantName: string;
  currencyCode: string;
  isDarkTheme: boolean;
}

const FOOD_TYPES: FoodType[] = ["Veg", "Non-Veg", "Egg"];
const deliverySize = DIMENSION_PRESETS.find((preset) => preset.id === "swiggy")!;

export const DeliveryMenuExportPanel: React.FC<DeliveryMenuExportPanelProps> = ({
  menuItems,
  restaurantName,
  currencyCode,
  isDarkTheme,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadedImageRow[]>([]);
  const [defaultFoodType, setDefaultFoodType] = useState<FoodType>("Veg");
  const [exportOnlyWithPhotos, setExportOnlyWithPhotos] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const card = isDarkTheme
    ? "bg-zinc-900 border-zinc-800 text-white"
    : "bg-white border-zinc-200 text-zinc-900";
  const muted = isDarkTheme ? "text-zinc-500" : "text-zinc-600";
  const dashed = isDarkTheme ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-zinc-50";
  const inputClass = isDarkTheme
    ? "bg-zinc-900 border-zinc-700 text-white focus:border-zinc-500"
    : "bg-white border-zinc-300 text-zinc-900 focus:border-zinc-500";

  const dishes = useMemo(() => flattenMenuDishes(menuItems), [menuItems]);
  const assignmentByDishId = useMemo(() => {
    const map = new Map<string, UploadedImageRow>();
    for (const upload of uploads) {
      if (upload.dishId) map.set(upload.dishId, upload);
    }
    return map;
  }, [uploads]);

  const uploadsRef = useRef(uploads);
  uploadsRef.current = uploads;

  useEffect(
    () => () => {
      revokeUploadedPreviews(uploadsRef.current);
    },
    [],
  );

  const ingestFiles = (files: FileList | File[]) => {
    const list = [...files].filter(isImageFile);
    if (list.length === 0) {
      setError("No image files found. Use JPG, PNG, or WebP.");
      return;
    }

    const rows = list.map((file) =>
      createUploadedImageRow(
        file,
        dishes,
        guessFoodType(file.name.replace(/\.[^.]+$/, ""), defaultFoodType),
        (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      ),
    );

    setUploads((current) => mergeUploadedImages(current, rows));
    setError(null);
    setStatusMessage(`Added ${list.length} image${list.length === 1 ? "" : "s"}. Review matches below.`);
  };

  const clearUploads = () => {
    revokeUploadedPreviews(uploads);
    setUploads([]);
    setStatusMessage(null);
  };

  const handleExport = async () => {
    if (dishes.length === 0) {
      setError("Add menu items in Menu Editor before exporting.");
      return;
    }

    setIsExporting(true);
    setError(null);
    setStatusMessage(null);

    try {
      const exportRows: DeliveryExportRow[] = [];
      let serial = 0;

      for (const dish of dishes) {
        const assigned = assignmentByDishId.get(dish.id);
        if (exportOnlyWithPhotos && !assigned) continue;

        serial += 1;
        let imageBuffer: ArrayBuffer | undefined;
        let imageExtension: "png" | "jpeg" | undefined;

        if (assigned) {
          const prepared = await prepareDeliveryImage(
            assigned.file,
            deliverySize.width,
            deliverySize.height,
          );
          imageBuffer = prepared.buffer;
          imageExtension = prepared.extension;
        }

        exportRows.push({
          serialNo: serial,
          category: dish.category,
          itemName: dish.name,
          price: Math.round(dish.price),
          foodType: assigned?.foodType ?? guessFoodType(dish.name, defaultFoodType),
          imageFileName: buildImageFileNameForDish(dish.name, assigned?.file),
          imageBuffer,
          imageExtension,
        });
      }

      if (exportRows.length === 0) {
        setError("No rows to export. Upload photos or turn off “Only items with photos”.");
        return;
      }

      const unmatchedUploads = uploads
        .filter((upload) => {
          if (!upload.dishId) return true;
          return assignmentByDishId.get(upload.dishId)?.id !== upload.id;
        })
        .map((upload) => upload.file.name);

      const withPhotos = exportRows.filter((row) => row.imageBuffer).length;
      const buffer = await buildDeliveryMenuExcel(exportRows, {
        restaurantName,
        currencyCode,
        generatedAt: new Date(),
        totalItems: dishes.length,
        withPhotos,
        missingPhotos: dishes.length - assignmentByDishId.size,
        unmatchedUploads,
      });

      const slug =
        restaurantName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() ||
        "menu";
      downloadExcelBuffer(buffer, `${slug}-zomato-swiggy-menu.xlsx`);
      setStatusMessage(`Exported ${exportRows.length} item${exportRows.length === 1 ? "" : "s"} to Excel.`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to build Excel file"));
    } finally {
      setIsExporting(false);
    }
  };

  const matchedCount = assignmentByDishId.size;

  return (
    <div className="space-y-6">
      {error && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${isDarkTheme ? "bg-red-950/40 border-red-900 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}
        >
          {error}
        </div>
      )}
      {statusMessage && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${isDarkTheme ? "bg-emerald-950/30 border-emerald-900 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}
        >
          {statusMessage}
        </div>
      )}

      <section className={`rounded-xl border p-5 ${card}`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <FileSpreadsheet size={18} />
              Zomato / Swiggy menu Excel
            </h2>
            <p className={`text-sm mt-1 max-w-2xl ${muted}`}>
              Upload photos in bulk (files or folders). Names are matched to menu items automatically.
              Export creates an Excel file with Menu, Export Summary, and Image Gallery sheets — sized
              for delivery apps ({deliverySize.size}).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={isExporting || dishes.length === 0}
            className={`shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-widest disabled:opacity-40 ${isDarkTheme ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            EXPORT EXCEL
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={`text-[10px] font-bold tracking-widest uppercase block mb-2 ${muted}`}>
              Default food type
            </label>
            <select
              value={defaultFoodType}
              onChange={(e) => setDefaultFoodType(e.target.value as FoodType)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none ${inputClass}`}
            >
              {FOOD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex items-end">
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${muted}`}>
              <input
                type="checkbox"
                checked={exportOnlyWithPhotos}
                onChange={(e) => setExportOnlyWithPhotos(e.target.checked)}
                className="rounded"
              />
              Only export items that have an uploaded photo
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) ingestFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={(e) => {
              if (e.target.files) ingestFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExporting}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
          >
            <Upload size={16} />
            Select images
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            disabled={isExporting}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
          >
            <FolderOpen size={16} />
            Select folder
          </button>
          {uploads.length > 0 && (
            <button
              type="button"
              onClick={clearUploads}
              disabled={isExporting}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${muted}`}
            >
              <X size={16} />
              Clear all ({uploads.length})
            </button>
          )}
        </div>

        <p className={`text-xs mt-4 ${muted}`}>
          {uploads.length} file{uploads.length === 1 ? "" : "s"} uploaded · {matchedCount} matched to
          menu · {dishes.length} menu item{dishes.length === 1 ? "" : "s"}
        </p>
      </section>

      {uploads.length > 0 && (
        <section className={`rounded-xl border overflow-hidden ${card}`}>
          <div className={`px-5 py-3 border-b ${isDarkTheme ? "border-zinc-800" : "border-zinc-200"}`}>
            <h3 className="font-semibold">Photo matching</h3>
            <p className={`text-xs mt-1 ${muted}`}>
              Adjust the menu item if auto-match is wrong. Food type can be changed per row.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={isDarkTheme ? "bg-zinc-950 text-zinc-400" : "bg-zinc-50 text-zinc-600"}>
                <tr>
                  <th className="text-left px-4 py-2 font-medium">File</th>
                  <th className="text-left px-4 py-2 font-medium">Preview</th>
                  <th className="text-left px-4 py-2 font-medium">Menu item</th>
                  <th className="text-left px-4 py-2 font-medium">Food type</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr
                    key={upload.id}
                    className={`border-t ${isDarkTheme ? "border-zinc-800" : "border-zinc-200"}`}
                  >
                    <td className="px-4 py-3 align-middle max-w-[180px] truncate" title={upload.relativePath}>
                      {upload.file.name}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <img
                        src={upload.previewUrl}
                        alt=""
                        className="w-12 h-12 object-cover rounded border border-zinc-700/30"
                      />
                    </td>
                    <td className="px-4 py-3 align-middle min-w-[220px]">
                      <select
                        value={upload.dishId ?? ""}
                        onChange={(e) => {
                          const dishId = e.target.value || null;
                          setUploads((current) =>
                            current.map((row) =>
                              row.id === upload.id ? { ...row, dishId } : row,
                            ),
                          );
                        }}
                        className={`w-full px-2 py-1.5 rounded-lg border text-sm outline-none ${inputClass}`}
                      >
                        <option value="">Unmatched</option>
                        {menuItems.map((cat) => (
                          <optgroup key={cat.id} label={cat.title}>
                            {cat.items.map((dish) => (
                              <option key={dish.id} value={dish.id}>
                                {dish.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <select
                        value={upload.foodType}
                        onChange={(e) => {
                          const foodType = e.target.value as FoodType;
                          setUploads((current) =>
                            current.map((row) =>
                              row.id === upload.id ? { ...row, foodType } : row,
                            ),
                          );
                        }}
                        className={`w-full px-2 py-1.5 rounded-lg border text-sm outline-none ${inputClass}`}
                      >
                        {FOOD_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {uploads.length === 0 && dishes.length > 0 && (
        <div className={`rounded-xl border border-dashed p-10 text-center ${dashed}`}>
          <Upload size={32} className={`mx-auto mb-3 ${muted}`} strokeWidth={1.2} />
          <p className={`text-sm ${muted}`}>
            Upload images named like your dishes (e.g. <strong>Orange Juice.png</strong>) or pick a
            folder of category photos.
          </p>
        </div>
      )}

      {dishes.length === 0 && (
        <InlineLoader label="Loading menu items…" className={`py-8 ${muted}`} />
      )}
    </div>
  );
};
