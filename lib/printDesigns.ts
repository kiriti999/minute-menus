/**
 * Print design constants — format dimensions, colour schemes, font pairings, templates.
 */
import type {
  ColorSchemeKey,
  DesignColors,
  DesignCustomization,
  DesignEffects,
  DesignFonts,
  DesignTypography,
  FontPairingKey,
  FormatOrientation,
  PrintDesignType,
  PrintFormat,
  StickerShape,
  TemplateCategory,
  TemplateStyle,
  JobFlyerContent,
} from "@minute-menus/types";
import { GRADIENT_PRESETS } from "./printDesignsGradients";

export { GRADIENT_PRESETS };

// ─── Format dimensions ────────────────────────────────────────────────────────

export interface FormatInfo {
  key: PrintFormat;
  label: string;
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  bleedMm: number;
  designType: PrintDesignType;
  shape: StickerShape | 'rect';
  orientation: FormatOrientation;
}

/** Convert mm to screen px at 96 DPI. */
const mmToPx = (mm: number) => Math.round(mm * 96 / 25.4);

const mmToCm = (mm: number) => Math.round((mm / 10) * 10) / 10;
const mmToIn = (mm: number) => Math.round((mm / 25.4) * 10) / 10;

/** Human-readable size in mm, cm, and inches — for format pickers and print specs. */
export function formatDimensionsLabel(widthMm: number, heightMm: number): string {
  const wCm = mmToCm(widthMm);
  const hCm = mmToCm(heightMm);
  const wIn = mmToIn(widthMm);
  const hIn = mmToIn(heightMm);
  return `${widthMm}×${heightMm}mm · ${wCm}×${hCm}cm · ${wIn}×${hIn}"`;
}

export interface PrintPreviewFit {
  scale: number;
  cssWidth: number;
  cssHeight: number;
  maxWidthCss: number;
  maxHeightCss: number;
}

/**
 * Fit any print format into a preview viewport (contain), preserving aspect ratio.
 * Pass the available container width so ultra-wide boards can use the full page.
 */
export function fitPrintPreview(
  widthPx: number,
  heightPx: number,
  containerMaxWidthCss = 1100,
  containerMaxHeightCss?: number,
): PrintPreviewFit {
  const w = Math.max(1, widthPx);
  const h = Math.max(1, heightPx);
  const aspect = w / h;
  const maxWidthCss = Math.max(240, containerMaxWidthCss);
  let maxHeightCss = containerMaxHeightCss ?? 420;
  if (containerMaxHeightCss == null) {
    if (aspect > 2.2) maxHeightCss = 280;
    else if (aspect > 1.55) maxHeightCss = 360;
    else if (aspect < 0.55) maxHeightCss = 560;
    else if (aspect < 0.85) maxHeightCss = 500;
    else if (Math.abs(aspect - 1) < 0.08) maxHeightCss = 360;
  }
  const scale = Math.min(maxWidthCss / w, maxHeightCss / h);
  return {
    scale,
    cssWidth: Math.max(1, Math.round(w * scale)),
    cssHeight: Math.max(1, Math.round(h * scale)),
    maxWidthCss,
    maxHeightCss,
  };
}

const fmt = (
  key: PrintFormat,
  label: string,
  w: number,
  h: number,
  designType: PrintDesignType,
  bleedMm: number,
  shape: StickerShape | 'rect' = 'rect',
): FormatInfo => ({
  key,
  label,
  widthMm: w,
  heightMm: h,
  widthPx: mmToPx(w),
  heightPx: mmToPx(h),
  bleedMm,
  designType,
  shape,
  orientation: w === h ? 'square' : w > h ? 'landscape' : 'portrait',
});

export const FORMATS: Record<PrintFormat, FormatInfo> = {
  a4:              fmt('a4',              'A4',                 210, 297,  'menu-card',   3),
  a3:              fmt('a3',              'A3',                 297, 420,  'menu-card',   3),
  tabloid:         fmt('tabloid',         'Tabloid 11×17"',     279, 432,  'menu-card',   3),
  // Wall boards — portrait
  a2:              fmt('a2',              'A2 Portrait',        420, 594,  'wall-board',  5),
  a1:              fmt('a1',              'A1 Portrait',        594, 841,  'wall-board',  5),
  a0:              fmt('a0',              'A0 Portrait',        841, 1189, 'wall-board',  5),
  '24x36':         fmt('24x36',           '24×36" Portrait',    610, 914,  'wall-board',  5),
  '18x24':         fmt('18x24',           '18×24" Portrait',    457, 610,  'wall-board',  5),
  '36x48':         fmt('36x48',           '36×48" Portrait',    914, 1219, 'wall-board',  5),
  // Wall boards — landscape (common above-counter / wide wall)
  'a2-landscape':  fmt('a2-landscape',    'A2 Landscape',       594, 420,  'wall-board',  5),
  'a1-landscape':  fmt('a1-landscape',    'A1 Landscape',       841, 594,  'wall-board',  5),
  'a0-landscape':  fmt('a0-landscape',    'A0 Landscape',       1189, 841, 'wall-board',  5),
  '36x24':         fmt('36x24',           '36×24" Landscape',   914, 610,  'wall-board',  5),
  '48x36':         fmt('48x36',           '48×36" Landscape',   1219, 914, 'wall-board',  5),
  // Shop-measured above-counter strip (72" wide × 23" tall)
  '72x23':         fmt('72x23',           '72×23" Landscape',   1829, 584,  'wall-board',  5),
  'square-24':     fmt('square-24',       '24×24" Square',      610, 610,  'wall-board',  5),
  dl:              fmt('dl',              'DL (1/3 A4)',        99,  210,  'pamphlet',    3),
  a5:              fmt('a5',              'A5',                 148, 210,  'pamphlet',    3),
  a6:              fmt('a6',              'A6 Flyer',           105, 148,  'pamphlet',    3),
  'business-card': fmt('business-card',   'Business Card',      90,  50,   'pocket-card', 2),
  'mini-card':     fmt('mini-card',       'Mini Card',          85,  55,   'pocket-card', 2),
  'circle-38':     fmt('circle-38',       'Circle Ø38mm (1.5")', 38,  38,   'sticker',     2, 'circle'),
  'circle-50':     fmt('circle-50',       'Circle Ø50mm',       50,  50,   'sticker',     2, 'circle'),
  'circle-75':     fmt('circle-75',       'Circle Ø75mm',       75,  75,   'sticker',     2, 'circle'),
  'circle-100':    fmt('circle-100',      'Circle Ø100mm',      100, 100,  'sticker',     2, 'circle'),
  'square-50':     fmt('square-50',       'Square 50×50mm',     50,  50,   'sticker',     2, 'square'),
  'square-75':     fmt('square-75',       'Square 75×75mm',     75,  75,   'sticker',     2, 'square'),
  'rect-100x50':   fmt('rect-100x50',     'Rect 100×50mm',      100, 50,   'sticker',     2, 'rectangle'),
};

export const WALL_BOARD_FORMAT_GROUPS: { label: string; formats: PrintFormat[] }[] = [
  { label: 'Landscape (wide wall)', formats: ['72x23', 'a2-landscape', 'a1-landscape', 'a0-landscape', '36x24', '48x36'] },
  { label: 'Portrait (tall wall)', formats: ['a2', 'a1', 'a0', '24x36', '18x24', '36x48'] },
  { label: 'Square', formats: ['square-24'] },
];

export const DESIGN_TYPE_FORMATS: Record<PrintDesignType, PrintFormat[]> = {
  'menu-card':   ['a4', 'a3', 'tabloid'],
  'wall-board':  WALL_BOARD_FORMAT_GROUPS.flatMap((g) => g.formats),
  'pamphlet':    ['a5', 'dl', 'a6'],
  'pocket-card': ['business-card', 'mini-card'],
  'sticker':     ['circle-38', 'circle-50', 'circle-75', 'circle-100', 'square-50', 'square-75', 'rect-100x50'],
  'job-flyer':   ['a5', 'dl', 'a6', 'a4'],
};

export const DEFAULT_FORMAT: Record<PrintDesignType, PrintFormat> = {
  'menu-card': 'a4', 'wall-board': '72x23', 'pamphlet': 'a5',
  'pocket-card': 'business-card', 'sticker': 'circle-75', 'job-flyer': 'a5',
};

export const DEFAULT_JOB_FLYER_DESCRIPTION = `We are a cloud kitchen looking for dedicated, hard-working individuals to join our operations team. If you want a stable part-time role with predictable hours and reliable pay, we want to hear from you.

What you will do:
• Prep, pack, and hand over evening orders to delivery partners
• Maintain workspace hygiene and assist with kitchen prep/inventory
• Work efficiently in a fast-paced environment

Who we are looking for:
• Highly reliable — on time at 4:00 PM is non-negotiable
• Detail-oriented — you follow instructions and take pride in your work
• Local candidates preferred — easy late-evening commute

How to apply:
Scan the QR code to WhatsApp us with your availability, location, and CV. Please do not call directly — candidates who follow the WhatsApp steps are contacted first.`;

export const DEFAULT_JOB_FLYER_CONTENT: JobFlyerContent = {
  roleTitle: 'Part time — Cloud Kitchen',
  employmentType: 'part-time',
  timings: '4 PM – 11 PM, Tue–Sun (Mon off)',
  salary: '₹12,000 – ₹15,000 / month',
  minAge: '18+ years',
  qualification: '12th pass or Studying degree',
  englishSkill: 'preferred',
  hookLine: 'Fixed Evening Shifts • Steady Income • Guaranteed Weekly Off',
  jobDescription: DEFAULT_JOB_FLYER_DESCRIPTION,
  extraNotes: 'Reliable & punctual. Local candidates preferred. Safe commute home at 11 PM required.',
  locationText: '',
  mapsUrl: '',
};

// ─── Colour schemes ───────────────────────────────────────────────────────────
// Curated for print menus: high contrast text, distinct roles
// (primary = headers, secondary = bands/gradients, accent = prices).
// Brand lead: Fresh & Fusion name-board teal (stickers / flyers / pamphlets).

/** Name-board brand palette — default for stickers, pamphlets, job flyers. */
export const BRAND_COLOR_SCHEME: ColorSchemeKey = 'teal-calm';

export function usesBrandColors(designType: PrintDesignType): boolean {
  return designType === 'pamphlet' || designType === 'sticker'
    || designType === 'job-flyer' || designType === 'pocket-card';
}

export const COLOR_SCHEMES: Record<ColorSchemeKey, DesignColors & { label: string }> = {
  // Lead with brand (Fresh & Fusion name board: deep teal · white · soft gold)
  'teal-calm':        { label: 'Fresh Teal',        primary: '#0B4A42', secondary: '#146B5E', background: '#FFFFFF', text: '#1A2E2A', textMuted: '#5A7A74', accent: '#C4A574', border: '#D5E5E0' },
  'classic-black':    { label: 'Ink & Brass',       primary: '#141414', secondary: '#3A3A3A', background: '#FAFAF8', text: '#1F1F1F', textMuted: '#6E6E6E', accent: '#A68B5B', border: '#E4E2DC' },
  'warm-sunset':      { label: 'Terracotta Glow',   primary: '#C23B22', secondary: '#E07A3D', background: '#FFF7F0', text: '#241612', textMuted: '#8A5A45', accent: '#E9A45A', border: '#EED4C0' },
  'ocean-blue':       { label: 'Coastal Slate',     primary: '#1B3A4B', secondary: '#3D6B7C', background: '#F4F7F8', text: '#15252E', textMuted: '#5A7380', accent: '#C4A35A', border: '#D0DCE2' },
  'forest-green':     { label: 'Moss & Cream',      primary: '#2F4A2B', secondary: '#6B8F5A', background: '#F6F3EA', text: '#1A2418', textMuted: '#5E6E56', accent: '#B8956C', border: '#D8D4C4' },
  'royal-purple':     { label: 'Jewel Indigo',      primary: '#3D1F5C', secondary: '#B33A3A', background: '#FFFBF5', text: '#1A1020', textMuted: '#6B5470', accent: '#C9A227', border: '#E8D8C4' },
  'spice-red':        { label: 'Burgundy Luxe',     primary: '#5C1A1B', secondary: '#8B3E3F', background: '#FBF7F2', text: '#2A1515', textMuted: '#7A5C5C', accent: '#C4A574', border: '#E6D5C6' },
  'minimalist-gray':  { label: 'Stone Minimal',     primary: '#2C3134', secondary: '#6A7075', background: '#F7F6F4', text: '#1C1E1F', textMuted: '#8A8F93', accent: '#9B9FA2', border: '#DDDCDA' },
  'vintage-brown':    { label: 'Walnut Parchment',  primary: '#4A3428', secondary: '#8B6F47', background: '#F7F0E6', text: '#2C2118', textMuted: '#7A6555', accent: '#A67C52', border: '#DDD0C0' },
  'indian-saffron':   { label: 'Masala Street',     primary: '#D9480F', secondary: '#E67700', background: '#FFF9F2', text: '#1A100A', textMuted: '#7A4E2E', accent: '#F08C00', border: '#F0D4B0' },
  'cafe-latte':       { label: 'Espresso Cream',    primary: '#4A3228', secondary: '#8B6B52', background: '#FDF6EE', text: '#2A1A12', textMuted: '#8B7355', accent: '#C4A484', border: '#E8D9C8' },
  'luxury-gold':      { label: 'Noir Champagne',    primary: '#0F0F0F', secondary: '#C9A84C', background: '#FAF8F2', text: '#141414', textMuted: '#6B6560', accent: '#D4AF6A', border: '#E5D9C0' },
  'fresh-mint':       { label: 'Sage Mist',         primary: '#2A5A4E', secondary: '#5B9A86', background: '#F3F8F6', text: '#16332C', textMuted: '#5A7A70', accent: '#C4A574', border: '#C8DDD4' },
  'berry-blast':      { label: 'Berry Wine',        primary: '#6B1F3A', secondary: '#A63D5C', background: '#FFF5F7', text: '#2A121C', textMuted: '#7A4A58', accent: '#D4A017', border: '#E8CDD4' },
  'sunset-orange':    { label: 'Amber Flame',       primary: '#C2410C', secondary: '#EA580C', background: '#FFF7ED', text: '#27150A', textMuted: '#9A5A30', accent: '#F59E0B', border: '#F0D4B0' },
  'deep-navy':        { label: 'Midnight Navy',     primary: '#14213D', secondary: '#1D3557', background: '#F7F8FA', text: '#0F172A', textMuted: '#5A6A80', accent: '#C9A84C', border: '#D0D6E0' },
  'earthy-olive':     { label: 'Olive Grove',       primary: '#4A5C28', secondary: '#7A8F45', background: '#F7F6EC', text: '#242810', textMuted: '#6A7050', accent: '#B8956C', border: '#D8D6C0' },
  'cherry-red':       { label: 'Ketchup Mustard',   primary: '#C8102E', secondary: '#E8A317', background: '#FFFFFF', text: '#1A1A1A', textMuted: '#666666', accent: '#E31837', border: '#E8C8C8' },
  'slate-modern':     { label: 'Graphite Cool',     primary: '#2F3A40', secondary: '#5A6B73', background: '#F2F4F5', text: '#1A2226', textMuted: '#6A7A82', accent: '#8A9AA2', border: '#D0D6DA' },
  'peach-cream':      { label: 'Blush Apricot',     primary: '#C45C3A', secondary: '#E08A6A', background: '#FFFAF5', text: '#2A1810', textMuted: '#8A6050', accent: '#E8B090', border: '#F0D8C8' },
  'citrus-punch':     { label: 'Mango Lime',        primary: '#E85D04', secondary: '#2D8A4E', background: '#FFFEF7', text: '#1A2410', textMuted: '#5A6B40', accent: '#F4B942', border: '#E8E0C0' },
  'garden-fresh':     { label: 'Garden Herb',       primary: '#2D5A27', secondary: '#5A8F3D', background: '#F5F9F0', text: '#1A2E14', textMuted: '#5A7550', accent: '#E07A3D', border: '#D0E0C0' },
  'banana-leaf':      { label: 'Banana Leaf',       primary: '#5C1D1D', secondary: '#3D6B2F', background: '#FFF9E8', text: '#2A1810', textMuted: '#6B5344', accent: '#D4A017', border: '#E8D4A8' },
  /** Matches Fresh & Fusion kitchen wall — bright yellow field, black ink for wall boards. */
  'wall-yellow':      { label: 'Wall Yellow',       primary: '#111111', secondary: '#2A2A2A', background: '#FFD200', text: '#111111', textMuted: '#3D3D3D', accent: '#111111', border: '#111111' },
};

/** Soft yellow column panels for wall-yellow boards — keeps equal column shapes with black ink. */
export const WALL_YELLOW_COLUMN_COLORS = ['#FFF3B0', '#FFE566', '#FFD200', '#F5C400', '#FFE566'];

/** Alternating pale / bright yellow rhythm for N wall columns. */
export function yellowColumnPattern(columns: number): string[] {
  const n = Math.max(1, columns);
  return Array.from({ length: n }, (_, i) => WALL_YELLOW_COLUMN_COLORS[i % WALL_YELLOW_COLUMN_COLORS.length]);
}

/** Default wall-board column border — mid grey (RGB 82,82,82). */
export const DEFAULT_COLUMN_BORDER_COLOR = '#525252';

/** Default sticker QR frame — thin mid grey. */
export const DEFAULT_QR_BORDER_COLOR = '#A3A3A3';
export const DEFAULT_QR_BORDER_WIDTH = 1;

// ─── Font pairings (15) ───────────────────────────────────────────────────────

export const FONT_PAIRINGS: Record<FontPairingKey, DesignFonts & { label: string; googleFonts: string[] }> = {
  'modern-clean':    { label: 'Modern Clean',    heading: 'Poppins', body: 'Inter', price: 'Poppins', googleFonts: ['Poppins:300,400,600,700', 'Inter:400,500'] },
  'classic-serif':   { label: 'Classic Serif',   heading: 'Playfair Display', body: 'Lora', price: 'Cormorant Garamond', googleFonts: ['Playfair+Display:400,700', 'Lora:400,500', 'Cormorant+Garamond:400,600'] },
  'bold-impact':     { label: 'Bold Impact',     heading: 'Oswald', body: 'Roboto', price: 'Oswald', googleFonts: ['Oswald:400,600,700', 'Roboto:400,500'] },
  'rustic-hand':     { label: 'Rustic Hand',     heading: 'Bebas Neue', body: 'Amatic SC', price: 'Bebas Neue', googleFonts: ['Bebas+Neue:400', 'Amatic+SC:400,700'] },
  'luxury-display':  { label: 'Luxury Display',  heading: 'Cinzel', body: 'Cormorant Garamond', price: 'Italiana', googleFonts: ['Cinzel:400,700', 'Cormorant+Garamond:400,600', 'Italiana:400'] },
  'street-playful':  { label: 'Street Playful',  heading: 'Baloo Bhai 2', body: 'Fredoka', price: 'Righteous', googleFonts: ['Baloo+Bhai+2:400,600,700', 'Fredoka:400,600', 'Righteous:400'] },
  'cafe-script':     { label: 'Cafe Script',     heading: 'Dancing Script', body: 'Pacifico', price: 'Satisfy', googleFonts: ['Dancing+Script:400,700', 'Pacifico:400', 'Satisfy:400'] },
  'fine-dining':     { label: 'Fine Dining',     heading: 'Cormorant', body: 'Crimson Text', price: 'Cormorant', googleFonts: ['Cormorant:400,600,700', 'Crimson+Text:400,600'] },
  'fast-condensed':  { label: 'Fast Condensed',  heading: 'Roboto Condensed', body: 'Barlow', price: 'Work Sans', googleFonts: ['Roboto+Condensed:400,700', 'Barlow:400,600', 'Work+Sans:400,600'] },
  'ethnic-hindi':    { label: 'Ethnic Hindi',    heading: 'Hind', body: 'Baloo Bhai 2', price: 'Hind', googleFonts: ['Hind:400,600,700', 'Baloo+Bhai+2:400,600'] },
  'editorial':       { label: 'Editorial',       heading: 'Merriweather', body: 'Libre Baskerville', price: 'Merriweather', googleFonts: ['Merriweather:400,700', 'Libre+Baskerville:400,700'] },
  'minimal-sans':    { label: 'Minimal Sans',    heading: 'Montserrat', body: 'Open Sans', price: 'Montserrat', googleFonts: ['Montserrat:300,400,600,700', 'Open+Sans:400,600'] },
  'warm-serif':      { label: 'Warm Serif',      heading: 'Libre Baskerville', body: 'Lora', price: 'Libre Baskerville', googleFonts: ['Libre+Baskerville:400,700', 'Lora:400,500'] },
  'pop-display':     { label: 'Pop Display',     heading: 'Anton', body: 'Archivo Black', price: 'Anton', googleFonts: ['Anton:400', 'Archivo+Black:400'] },
  'heritage':        { label: 'Heritage',        heading: 'Tiro Devanagari Hindi', body: 'Mukta', price: 'Tiro Devanagari Hindi', googleFonts: ['Tiro+Devanagari+Hindi:400', 'Mukta:400,600'] },
  'name-board':      { label: 'Name Board',      heading: 'Playfair Display', body: 'Montserrat', price: 'Montserrat', googleFonts: ['Playfair+Display:400,700', 'Montserrat:400,600,700', 'Great+Vibes:400'] },
};

/** Individual Google Fonts available for custom per-element selection. */
export const GOOGLE_FONT_OPTIONS = [
  'Poppins', 'Inter', 'Montserrat', 'Roboto', 'Open Sans', 'Lato',
  'Playfair Display', 'Cormorant', 'Lora', 'Libre Baskerville', 'Merriweather',
  'Oswald', 'Bebas Neue', 'Anton', 'Righteous',
  'Dancing Script', 'Pacifico', 'Satisfy', 'Great Vibes', 'Allura', 'Sacramento', 'Tangerine',
  'Cinzel Decorative', 'Abril Fatface', 'Lobster', 'Courgette', 'Kaushan Script',
  'Hind', 'Baloo Bhai 2', 'Mukta', 'Tiro Devanagari Hindi',
  'Cinzel', 'Barlow', 'Work Sans', 'Roboto Condensed',
] as const;

// ─── Template styles (10) ─────────────────────────────────────────────────────

export interface TemplateInfo {
  key: TemplateStyle;
  label: string;
  description: string;
  category: TemplateCategory;
  defaultColors: ColorSchemeKey;
  defaultFonts: FontPairingKey;
  previewColors: [string, string, string];
}

export const TEMPLATE_CATEGORIES: { key: TemplateCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'modern', label: 'Modern' },
  { key: 'classic', label: 'Classic' },
  { key: 'casual', label: 'Casual' },
  { key: 'premium', label: 'Premium' },
  { key: 'indian', label: 'Indian' },
];

export const TEMPLATES: TemplateInfo[] = [
  { key: 'modern-minimal',      label: 'Modern Minimal',       description: 'Ink black, soft brass accents',      category: 'modern',  defaultColors: 'classic-black',    defaultFonts: 'modern-clean',    previewColors: ['#141414', '#FAFAF8', '#A68B5B'] },
  { key: 'classic-elegant',     label: 'Classic Elegant',      description: 'Burgundy serif, cream paper',       category: 'classic', defaultColors: 'spice-red',        defaultFonts: 'classic-serif',   previewColors: ['#5C1A1B', '#FBF7F2', '#C4A574'] },
  { key: 'bold-colorful',       label: 'Bold & Colorful',      description: 'Terracotta energy, warm cream',     category: 'casual',  defaultColors: 'warm-sunset',      defaultFonts: 'bold-impact',     previewColors: ['#C23B22', '#FFF7F0', '#E9A45A'] },
  { key: 'rustic-vintage',      label: 'Rustic Vintage',       description: 'Walnut ink on parchment',          category: 'casual',  defaultColors: 'vintage-brown',    defaultFonts: 'rustic-hand',     previewColors: ['#4A3428', '#F7F0E6', '#A67C52'] },
  { key: 'luxury-premium',      label: 'Luxury Premium',       description: 'Noir base, champagne gold',        category: 'premium', defaultColors: 'luxury-gold',      defaultFonts: 'luxury-display',  previewColors: ['#0F0F0F', '#FAF8F2', '#C9A84C'] },
  { key: 'cafe-cozy',           label: 'Cafe Cozy',            description: 'Espresso brown, soft cream',       category: 'casual',  defaultColors: 'cafe-latte',       defaultFonts: 'cafe-script',     previewColors: ['#4A3228', '#FDF6EE', '#C4A484'] },
  { key: 'fine-dining-minimal', label: 'Fine Dining Minimal',  description: 'Cool stone, quiet luxury',         category: 'premium', defaultColors: 'minimalist-gray',  defaultFonts: 'fine-dining',     previewColors: ['#2C3134', '#F7F6F4', '#9B9FA2'] },
  { key: 'fast-food-pop',       label: 'Fast Food Pop',        description: 'Ketchup red + mustard punch',      category: 'casual',  defaultColors: 'cherry-red',       defaultFonts: 'fast-condensed',  previewColors: ['#C8102E', '#FFFFFF', '#E8A317'] },
  { key: 'ethnic-traditional',  label: 'Ethnic Traditional',   description: 'Indigo, vermillion & gold',        category: 'indian',  defaultColors: 'royal-purple',     defaultFonts: 'ethnic-hindi',    previewColors: ['#3D1F5C', '#FFFBF5', '#C9A227'] },
  { key: 'salad-bowl-fresh',    label: 'Salad Bowl Fresh',     description: 'Herb green, carrot accent',        category: 'modern',  defaultColors: 'garden-fresh',     defaultFonts: 'minimal-sans',    previewColors: ['#2D5A27', '#F5F9F0', '#E07A3D'] },
  { key: 'south-indian-mess',   label: 'South Indian Mess',    description: 'Maroon, leaf green, turmeric',     category: 'indian',  defaultColors: 'banana-leaf',      defaultFonts: 'heritage',        previewColors: ['#5C1D1D', '#FFF9E8', '#D4A017'] },
  { key: 'name-board-yellow',   label: 'Name Board Yellow',    description: 'Wall yellow, black ink title',     category: 'casual',  defaultColors: 'wall-yellow',      defaultFonts: 'name-board',      previewColors: ['#111111', '#FFD200', '#111111'] },
];

export const DEFAULT_TYPOGRAPHY: DesignTypography = {
  headingSize: 'medium', bodySize: 'medium', headingWeight: 'regular', textTransform: 'capitalize', titleStyle: 'classic',
};

export const DEFAULT_EFFECTS: DesignEffects = {
  cornerRadius: 'none', shadow: 'none',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function resolveFonts(customization: DesignCustomization): DesignFonts {
  return {
    heading: customization.customFonts?.heading ?? customization.fonts.heading,
    body: customization.customFonts?.body ?? customization.fonts.body,
    price: customization.customFonts?.price ?? customization.fonts.price,
  };
}

export function googleFontsForCustomization(customization: DesignCustomization): string[] {
  const pairing = FONT_PAIRINGS[customization.fontPairing].googleFonts;
  const resolved = resolveFonts(customization);
  const extra = [resolved.heading, resolved.body, resolved.price]
    .filter((f) => !pairing.some((p) => p.startsWith(f.replace(/ /g, '+'))))
    .map((f) => `${f.replace(/ /g, '+')}:400,600,700`);
  const titleStyle = customization.typography.titleStyle ?? 'classic';
  const titleFonts = titleStyle === 'classic' ? [] : [`${({ cursive: 'Dancing Script', bold: 'Anton', elegant: 'Playfair Display' } as const)[titleStyle].replace(/ /g, '+')}:400,700`];
  return [...pairing, ...extra, ...titleFonts.filter((f) => !pairing.some((p) => p.startsWith(f.split(':')[0])))];
}

function colorsFromScheme(key: ColorSchemeKey): DesignColors {
  const s = COLOR_SCHEMES[key];
  return {
    primary: s.primary, secondary: s.secondary, background: s.background,
    text: s.text, textMuted: s.textMuted, accent: s.accent, border: s.border,
  };
}

/** Default template for brand print formats (name-board aligned). */
export const BRAND_TEMPLATE_STYLE: TemplateStyle = 'modern-minimal';

export type DefaultCustomizationOpts = {
  /** When true, stickers/flyers/pamphlets start on Fresh Teal. Template picks use the template palette instead. */
  preferBrandColors?: boolean;
};

export function defaultCustomization(
  style: TemplateStyle,
  designType?: PrintDesignType,
  opts?: DefaultCustomizationOpts,
): DesignCustomization {
  const tmpl = TEMPLATES.find((t) => t.key === style) ?? TEMPLATES[0];
  const useBrand = Boolean(opts?.preferBrandColors && designType && usesBrandColors(designType));
  const colorKey = useBrand ? BRAND_COLOR_SCHEME : tmpl.defaultColors;
  const fonts = FONT_PAIRINGS[tmpl.defaultFonts];
  const isNameBoardYellow = style === 'name-board-yellow';
  const isWall = designType === 'wall-board';
  return {
    colorScheme: isNameBoardYellow ? 'wall-yellow' : colorKey,
    fontPairing: tmpl.defaultFonts,
    colors: colorsFromScheme(isNameBoardYellow ? 'wall-yellow' : colorKey),
    fonts: { heading: fonts.heading, body: fonts.body, price: fonts.price },
    typography: {
      ...DEFAULT_TYPOGRAPHY,
      ...(isNameBoardYellow ? { textTransform: 'none' as const, titleStyle: 'elegant' as const, headingWeight: 'bold' as const } : {}),
    },
    effects: { ...DEFAULT_EFFECTS },
    layout: {
      columns: isWall ? 5 : 2,
      spacing: 'normal',
      alignment: isNameBoardYellow ? 'center' : 'left',
      categoryStyle: 'heading',
    },
    showPrices: true,
    showDescriptions: !isWall && !isNameBoardYellow,
    showImages: false,
    showQR: !isWall,
    showTagline: true,
    borderStyle: isNameBoardYellow ? 'none' : 'simple',
    backgroundType: 'solid',
    backgroundGradient: GRADIENT_PRESETS[0].value,
    logoUrl: undefined, logoPosition: isNameBoardYellow ? 'center' : 'left',
    colorMode: 'rgb', showBleedGuides: false, includeCropMarks: false,
    showColumnBorders: false,
    columnBorderColor: DEFAULT_COLUMN_BORDER_COLOR,
    priceLeaderStyle: 'none',
    qrBorderWidth: DEFAULT_QR_BORDER_WIDTH,
    qrBorderColor: DEFAULT_QR_BORDER_COLOR,
    ...(isNameBoardYellow ? { columnColors: yellowColumnPattern(isWall ? 5 : 2) } : {}),
  };
}
