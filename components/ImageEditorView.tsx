import { getErrorMessage } from "@minute-menus/errors";
import type { Category } from "@minute-menus/types";
import { UserTier } from "@minute-menus/types";
import { ButtonSpinner, InlineLoader } from "@minute-menus/ui";
import {
  Check,
  Crop,
  Download,
  Lock,
  Move,
  Sparkles,
  Upload,
  Wand2,
  ZoomIn,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CROP_TRANSFORM,
  downloadDataUrl,
  fileToDataUrl,
  loadImageSource,
  renderCroppedImage,
  type CropTransform,
} from "../lib/imageEditor/canvasResize";
import {
  clampDimension,
  CUSTOM_DIMENSION_MAX,
  CUSTOM_DIMENSION_MIN,
  DIMENSION_PRESETS,
  getOutputDimensions,
  type PresetId,
} from "../lib/imageEditor/presets";
import { supabaseService } from "../services/supabaseService";

const STYLE_PRESETS = [
  "Bright & Airy Close-Up",
  "Dark Hero Shot",
  "Natural Hero Shot",
  "Warm Hero Shot",
  "Bold Minimalist Studio",
  "Dark Elegant Overhead",
] as const;

type DishOption = {
  id: string;
  label: string;
  imageUrl: string;
  catIndex: number;
  dishIndex: number;
};

export interface ImageEditorViewProps {
  menuItems: Category[];
  restaurantId: string | null;
  isDarkTheme: boolean;
  userTier: UserTier;
  onUpgrade: () => void;
  onMenuUpdated: (menu: Category[]) => void;
}

export const ImageEditorView: React.FC<ImageEditorViewProps> = ({
  menuItems,
  restaurantId,
  isDarkTheme,
  userTier,
  onUpgrade,
  onMenuUpdated,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>("");
  const [sourceDishId, setSourceDishId] = useState<string | null>(null);
  const [applyDishId, setApplyDishId] = useState<string>("");
  const [presetId, setPresetId] = useState<PresetId>("reel");
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);
  const [transform, setTransform] = useState<CropTransform>(DEFAULT_CROP_TRANSFORM);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const card = isDarkTheme
    ? "bg-zinc-900 border-zinc-800 text-white"
    : "bg-white border-zinc-200 text-zinc-900";
  const muted = isDarkTheme ? "text-zinc-500" : "text-zinc-600";
  const surface = isDarkTheme ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200";
  const inputClass = isDarkTheme
    ? "bg-zinc-900 border-zinc-700 text-white focus:border-zinc-500"
    : "bg-white border-zinc-300 text-zinc-900 focus:border-zinc-500";

  const dishOptions = useMemo<DishOption[]>(
    () =>
      menuItems.flatMap((cat, catIndex) =>
        cat.items.map((dish, dishIndex) => ({
          id: dish.id,
          label: `${cat.title} — ${dish.name}`,
          imageUrl: dish.imageUrl,
          catIndex,
          dishIndex,
        })),
      ),
    [menuItems],
  );

  const outputDimensions = getOutputDimensions(presetId, customWidth, customHeight);
  const hasSource = Boolean(sourcePreviewUrl);

  const resetTransform = useCallback(() => {
    setTransform(DEFAULT_CROP_TRANSFORM);
  }, []);

  const loadSource = useCallback(
    async (url: string, label: string, dishId: string | null) => {
      setIsLoadingSource(true);
      setError(null);
      setStatusMessage(null);
      try {
        const img = await loadImageSource(url);
        imageRef.current = img;
        setSourcePreviewUrl(url);
        setSourceLabel(label);
        setSourceDishId(dishId);
        if (dishId) setApplyDishId(dishId);
        resetTransform();
      } catch (err) {
        imageRef.current = null;
        setSourcePreviewUrl(null);
        setError(getErrorMessage(err, "Failed to load image"));
      } finally {
        setIsLoadingSource(false);
      }
    },
    [resetTransform],
  );

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const dataUrl = await fileToDataUrl(file);
        await loadSource(dataUrl, file.name, null);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to read file"));
      }
    },
    [loadSource],
  );

  const handleDishSelect = useCallback(
    async (dishId: string) => {
      const dish = dishOptions.find((d) => d.id === dishId);
      if (!dish?.imageUrl) {
        setError("This dish has no photo yet. Upload one in Menu Editor first.");
        return;
      }
      await loadSource(dish.imageUrl, dish.label, dish.id);
    },
    [dishOptions, loadSource],
  );

  const exportImage = useCallback(async (): Promise<string> => {
    const img = imageRef.current;
    const preview = previewRef.current;
    if (!img || !preview) throw new Error("Load an image first");

    const previewWidth = preview.clientWidth;
    const previewHeight = preview.clientHeight;
    if (previewWidth < 1 || previewHeight < 1) {
      throw new Error("Preview is not ready. Try again in a moment.");
    }

    return renderCroppedImage(
      img,
      outputDimensions.width,
      outputDimensions.height,
      previewWidth,
      previewHeight,
      transform,
      "image/png",
    );
  }, [outputDimensions.height, outputDimensions.width, transform]);

  const handleDownload = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const dataUrl = await exportImage();
      const slug = sourceLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "menu-photo";
      downloadDataUrl(dataUrl, `${slug}-${outputDimensions.width}x${outputDimensions.height}.png`);
      setStatusMessage("Download started.");
    } catch (err) {
      setError(getErrorMessage(err, "Export failed"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleApplyToMenu = async () => {
    if (!restaurantId) {
      setError("Restaurant not loaded. Refresh and try again.");
      return;
    }
    if (!applyDishId) {
      setError("Choose a menu item to apply this image to.");
      return;
    }

    const target = dishOptions.find((d) => d.id === applyDishId);
    if (!target) {
      setError("Selected dish was not found.");
      return;
    }

    setIsApplying(true);
    setError(null);
    try {
      const dataUrl = await exportImage();
      const newMenu = menuItems.map((cat, catIndex) =>
        catIndex !== target.catIndex
          ? cat
          : {
              ...cat,
              items: cat.items.map((dish, dishIndex) =>
                dishIndex !== target.dishIndex ? dish : { ...dish, imageUrl: dataUrl },
              ),
            },
      );
      const saved = await supabaseService.saveMenu(newMenu);
      onMenuUpdated(saved);
      setStatusMessage(`Applied to ${target.label.split(" — ").pop() ?? "menu item"}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to apply image"));
    } finally {
      setIsApplying(false);
    }
  };

  useEffect(() => {
    resetTransform();
  }, [presetId, customWidth, customHeight, resetTransform]);

  const onPanStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - transform.panX, y: clientY - transform.panY });
  };

  const onPanMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      panX: clientX - dragStart.x,
      panY: clientY - dragStart.y,
    }));
  };

  const onPanEnd = () => setIsDragging(false);

  const previewAspect = `${outputDimensions.width}/${outputDimensions.height}`;

  return (
    <div
      className={`flex-1 overflow-y-auto animate-in slide-in-from-right-4 duration-500 pb-24 ${isDarkTheme ? "bg-black" : "bg-zinc-50"}`}
    >
      <header
        className={`backdrop-blur-md sticky top-0 z-20 px-4 md:px-8 py-5 border-b flex flex-col md:flex-row justify-between md:items-center gap-3 ${isDarkTheme ? "bg-black/80 border-zinc-800" : "bg-white/80 border-zinc-200"}`}
      >
        <div>
          <h1
            className={`text-2xl md:text-3xl font-light tracking-tight ${isDarkTheme ? "text-white" : "text-zinc-900"}`}
          >
            Image Editor
          </h1>
          <p className={`text-xs mt-1 max-w-xl ${muted}`}>
            Resize and crop for reels, delivery apps, and banners. Upload a new photo or start from an
            existing menu image.
          </p>
        </div>
        <div className={`flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase ${muted}`}>
          <Sparkles size={14} />
          {outputDimensions.width} × {outputDimensions.height}px
        </div>
      </header>

      <div className="px-4 md:px-8 py-8 space-y-8 max-w-6xl">
        {error && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${isDarkTheme ? "bg-red-950/40 border-red-900 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}
          >
            {error}
          </div>
        )}
        {statusMessage && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${isDarkTheme ? "bg-emerald-950/30 border-emerald-900 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}
          >
            <Check size={16} />
            {statusMessage}
          </div>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
          {/* Left: source + preview */}
          <div className="space-y-6">
            <section className={`rounded-xl border p-5 ${card}`}>
              <h2 className="font-semibold mb-4">1. Choose source</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-[10px] font-bold tracking-widest uppercase block mb-2 ${muted}`}>
                    Upload photo
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoadingSource}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
                  >
                    <Upload size={16} />
                    Upload from device
                  </button>
                </div>
                <div>
                  <label className={`text-[10px] font-bold tracking-widest uppercase block mb-2 ${muted}`}>
                    From menu ({dishOptions.length} items)
                  </label>
                  <select
                    value={sourceDishId ?? ""}
                    onChange={(e) => {
                      if (e.target.value) void handleDishSelect(e.target.value);
                    }}
                    disabled={isLoadingSource || dishOptions.length === 0}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none ${inputClass}`}
                  >
                    <option value="">Select a dish…</option>
                    {menuItems.map((cat) => (
                      <optgroup key={cat.id} label={cat.title}>
                        {cat.items.map((dish) => (
                          <option key={dish.id} value={dish.id} disabled={!dish.imageUrl}>
                            {dish.name}
                            {!dish.imageUrl ? " (no photo)" : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className={`mt-4 rounded-xl border border-dashed p-8 text-center transition-colors ${surface} ${isDragOver ? (isDarkTheme ? "border-white/40 bg-zinc-900" : "border-zinc-400 bg-white") : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleFile(file);
                }}
              >
                {isLoadingSource ? (
                  <InlineLoader label="Loading image…" className={muted} />
                ) : sourcePreviewUrl ? (
                  <p className={`text-sm ${muted}`}>
                    Editing: <span className={isDarkTheme ? "text-zinc-300" : "text-zinc-800"}>{sourceLabel}</span>
                  </p>
                ) : (
                  <>
                    <Upload size={28} className={`mx-auto mb-3 ${muted}`} strokeWidth={1.2} />
                    <p className={`text-sm ${muted}`}>Drag and drop a photo here</p>
                  </>
                )}
              </div>
            </section>

            <section className={`rounded-xl border p-5 ${card}`}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="font-semibold">2. Crop &amp; position</h2>
                <button
                  type="button"
                  onClick={resetTransform}
                  disabled={!hasSource}
                  className={`text-xs font-bold tracking-widest disabled:opacity-40 ${muted}`}
                >
                  RESET
                </button>
              </div>

              <div className="flex flex-col items-center">
                <div
                  ref={previewRef}
                  className={`relative w-full max-w-sm overflow-hidden border touch-none select-none ${isDarkTheme ? "bg-black border-zinc-700" : "bg-zinc-100 border-zinc-300"} ${!hasSource ? "opacity-40 pointer-events-none" : "cursor-move"}`}
                  style={{ aspectRatio: previewAspect }}
                  onMouseDown={(e) => onPanStart(e.clientX, e.clientY)}
                  onMouseMove={(e) => onPanMove(e.clientX, e.clientY)}
                  onMouseUp={onPanEnd}
                  onMouseLeave={onPanEnd}
                  onTouchStart={(e) => onPanStart(e.touches[0].clientX, e.touches[0].clientY)}
                  onTouchMove={(e) => onPanMove(e.touches[0].clientX, e.touches[0].clientY)}
                  onTouchEnd={onPanEnd}
                >
                  {sourcePreviewUrl && (
                    <img
                      src={sourcePreviewUrl}
                      alt="Crop preview"
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{
                        transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.scale})`,
                      }}
                    />
                  )}
                  {!sourcePreviewUrl && (
                    <div className={`absolute inset-0 flex items-center justify-center text-xs ${muted}`}>
                      Load a photo to preview crop
                    </div>
                  )}
                  {hasSource && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-black/60 text-white">
                      <Move size={10} />
                      Drag to pan
                    </div>
                  )}
                </div>

                <div className="w-full max-w-sm mt-5 space-y-2">
                  <div className={`flex justify-between text-xs ${muted}`}>
                    <span className="flex items-center gap-1">
                      <ZoomIn size={12} />
                      Zoom
                    </span>
                    <span>{(transform.scale * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.01"
                    value={transform.scale}
                    disabled={!hasSource}
                    onChange={(e) =>
                      setTransform((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))
                    }
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-40 ${isDarkTheme ? "bg-zinc-700 accent-white" : "bg-zinc-300 accent-zinc-900"}`}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right: presets + export */}
          <div className="space-y-6">
            <section className={`rounded-xl border p-5 ${card}`}>
              <h2 className="font-semibold mb-1 flex items-center gap-2">
                <Crop size={16} />
                Output size
              </h2>
              <p className={`text-xs mb-4 ${muted}`}>Pick a preset or set custom dimensions.</p>
              <div className="space-y-2">
                {DIMENSION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPresetId(preset.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-all ${
                      presetId === preset.id
                        ? isDarkTheme
                          ? "border-white bg-zinc-800"
                          : "border-zinc-900 bg-zinc-100"
                        : isDarkTheme
                          ? "border-zinc-800 hover:border-zinc-600"
                          : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-sm">{preset.label}</span>
                      <span className={`text-[10px] font-mono ${muted}`}>{preset.ratio}</span>
                    </div>
                    <p className={`text-xs mt-1 font-mono ${muted}`}>{preset.size}</p>
                  </button>
                ))}
              </div>

              {presetId === "custom" && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className={`text-[10px] font-bold tracking-widest uppercase block mb-1 ${muted}`}>
                      Width
                    </label>
                    <input
                      type="number"
                      min={CUSTOM_DIMENSION_MIN}
                      max={CUSTOM_DIMENSION_MAX}
                      value={customWidth}
                      onChange={(e) => setCustomWidth(clampDimension(Number(e.target.value) || CUSTOM_DIMENSION_MIN))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold tracking-widest uppercase block mb-1 ${muted}`}>
                      Height
                    </label>
                    <input
                      type="number"
                      min={CUSTOM_DIMENSION_MIN}
                      max={CUSTOM_DIMENSION_MAX}
                      value={customHeight}
                      onChange={(e) => setCustomHeight(clampDimension(Number(e.target.value) || CUSTOM_DIMENSION_MIN))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`}
                    />
                  </div>
                </div>
              )}
            </section>

            <section className={`rounded-xl border p-5 ${card}`}>
              <h2 className="font-semibold mb-4">3. Export</h2>
              <label className={`text-[10px] font-bold tracking-widest uppercase block mb-2 ${muted}`}>
                Apply to menu item
              </label>
              <select
                value={applyDishId}
                onChange={(e) => setApplyDishId(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none mb-4 ${inputClass}`}
              >
                <option value="">Select dish…</option>
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

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  disabled={!hasSource || isExporting || isApplying}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-widest border disabled:opacity-40 ${isDarkTheme ? "border-zinc-600 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
                >
                  {isExporting ? <ButtonSpinner /> : <Download size={14} />}
                  DOWNLOAD PNG
                </button>
                <button
                  type="button"
                  onClick={() => void handleApplyToMenu()}
                  disabled={!hasSource || !applyDishId || isApplying || isExporting}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-widest disabled:opacity-40 ${isDarkTheme ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}
                >
                  {isApplying ? <ButtonSpinner /> : <Check size={14} />}
                  APPLY TO MENU ITEM
                </button>
              </div>
            </section>

            <section className={`rounded-xl border p-5 ${card}`}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-semibold text-sm">AI styles (Phase 2)</h2>
                {userTier === UserTier.FREE && (
                  <button
                    type="button"
                    onClick={onUpgrade}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border ${isDarkTheme ? "border-purple-500/50 text-purple-400" : "border-purple-600/50 text-purple-700"}`}
                  >
                    <Lock size={10} />
                    PLUS
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 opacity-50">
                {STYLE_PRESETS.slice(0, 4).map((style) => (
                  <div
                    key={style}
                    className={`rounded-lg border p-2 text-[10px] leading-tight ${isDarkTheme ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-zinc-50"}`}
                  >
                    <Wand2 size={12} className={`mb-1 ${muted}`} />
                    {style}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
