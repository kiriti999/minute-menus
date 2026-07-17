export type PresetId = "reel" | "square" | "banner" | "swiggy" | "custom";

export type DimensionPreset = {
  id: PresetId;
  label: string;
  ratio: string;
  size: string;
  use: string;
  width: number;
  height: number;
};

export const DIMENSION_PRESETS: DimensionPreset[] = [
  {
    id: "reel",
    label: "Menu Reel",
    ratio: "9:16",
    size: "1080 × 1920",
    use: "Customer reel cards",
    width: 1080,
    height: 1920,
  },
  {
    id: "square",
    label: "Square",
    ratio: "1:1",
    size: "1200 × 1200",
    use: "Grid & social",
    width: 1200,
    height: 1200,
  },
  {
    id: "banner",
    label: "Hero Banner",
    ratio: "16:9",
    size: "1920 × 1080",
    use: "Website header",
    width: 1920,
    height: 1080,
  },
  {
    id: "swiggy",
    label: "Swiggy",
    ratio: "1:1",
    size: "1024 × 1024",
    use: "Swiggy dish photo",
    width: 1024,
    height: 1024,
  },
  {
    id: "custom",
    label: "Custom",
    ratio: "—",
    size: "Your dimensions",
    use: "Manual width × height",
    width: 1080,
    height: 1080,
  },
];

export const CUSTOM_DIMENSION_MIN = 100;
export const CUSTOM_DIMENSION_MAX = 4096;

export const getOutputDimensions = (
  presetId: PresetId,
  customWidth: number,
  customHeight: number,
): { width: number; height: number } => {
  if (presetId === "custom") {
    return {
      width: clampDimension(customWidth),
      height: clampDimension(customHeight),
    };
  }
  const preset = DIMENSION_PRESETS.find((p) => p.id === presetId);
  return { width: preset?.width ?? 1080, height: preset?.height ?? 1080 };
};

export const clampDimension = (value: number): number =>
  Math.min(CUSTOM_DIMENSION_MAX, Math.max(CUSTOM_DIMENSION_MIN, Math.round(value)));
