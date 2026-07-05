export type PhotographyStyleId =
  | "bright-airy"
  | "dark-hero"
  | "natural-hero"
  | "warm-hero"
  | "minimal-studio"
  | "dark-overhead";

export type PhotographyStyle = {
  id: PhotographyStyleId;
  label: string;
  tag: string;
  prompt: string;
};

export const PHOTOGRAPHY_STYLES: PhotographyStyle[] = [
  {
    id: "bright-airy",
    label: "Bright & Airy Close-Up",
    tag: "editorial",
    prompt:
      "Enhance this real food photograph for a premium restaurant menu. Use bright, soft natural lighting, airy tones, and a clean softly blurred background. Tight appetizing close-up. Preserve the exact dish, ingredients, portions, and plating — improve only photography quality.",
  },
  {
    id: "dark-hero",
    label: "Dark Hero Shot",
    tag: "artisan",
    prompt:
      "Enhance this real food photograph as a moody dark hero shot with dramatic shallow focus, rich shadows, and subtle highlights on the food. Preserve the exact dish, ingredients, portions, and plating — improve only lighting and background presentation.",
  },
  {
    id: "natural-hero",
    label: "Natural Hero Shot",
    tag: "editorial",
    prompt:
      "Enhance this real food photograph with balanced natural daylight, true-to-life colors, and a soft neutral background. Hero close-up composition. Preserve the exact dish, ingredients, portions, and plating — improve only professional presentation.",
  },
  {
    id: "warm-hero",
    label: "Warm Hero Shot",
    tag: "artisan",
    prompt:
      "Enhance this real food photograph with warm golden-hour lighting, inviting tones, and gentle background blur. Preserve the exact dish, ingredients, portions, and plating — improve only warmth, lighting, and menu-ready polish.",
  },
  {
    id: "minimal-studio",
    label: "Bold Minimalist Studio",
    tag: "commercial",
    prompt:
      "Enhance this real food photograph as a clean minimalist studio shot with even lighting, vibrant but natural colors, and an uncluttered background suitable for delivery apps. Preserve the exact dish, ingredients, portions, and plating.",
  },
  {
    id: "dark-overhead",
    label: "Dark Elegant Overhead",
    tag: "editorial",
    prompt:
      "Enhance this real food photograph as an elegant overhead flat-lay with sophisticated dark tones, soft top lighting, and refined styling. Preserve the exact dish, ingredients, portions, and plating — improve only composition and lighting.",
  },
];

export const getPhotographyStyle = (id: PhotographyStyleId): PhotographyStyle => {
  const style = PHOTOGRAPHY_STYLES.find((s) => s.id === id);
  if (!style) throw new Error(`Unknown photography style: ${id}`);
  return style;
};

export const isPhotographyStyleId = (value: string): value is PhotographyStyleId =>
  PHOTOGRAPHY_STYLES.some((s) => s.id === value);

/** Closest Gemini-supported aspect ratio for output dimensions. */
export const toGeminiAspectRatio = (width: number, height: number): string => {
  const ratio = width / height;
  const options: { label: string; value: number }[] = [
    { label: "1:1", value: 1 },
    { label: "9:16", value: 9 / 16 },
    { label: "16:9", value: 16 / 9 },
    { label: "4:3", value: 4 / 3 },
    { label: "3:4", value: 3 / 4 },
    { label: "4:5", value: 4 / 5 },
    { label: "5:4", value: 5 / 4 },
  ];
  let best = options[0];
  let bestDelta = Math.abs(ratio - best.value);
  for (const opt of options) {
    const delta = Math.abs(ratio - opt.value);
    if (delta < bestDelta) {
      best = opt;
      bestDelta = delta;
    }
  }
  return best.label;
};
