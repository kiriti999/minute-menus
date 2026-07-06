/**
 * Print design constants — format dimensions, colour schemes, font pairings.
 * All pixel values are at 96 DPI (screen). For PDF export html2canvas captures
 * at 2× scale giving ~192 DPI, enough for most commercial printing up to A4.
 */
import type {
  ColorSchemeKey,
  DesignColors,
  DesignCustomization,
  DesignFonts,
  FontPairingKey,
  PrintDesignType,
  PrintFormat,
  TemplateStyle,
} from "@minute-menus/types";

// ─── Format dimensions ────────────────────────────────────────────────────────

export interface FormatInfo {
  key: PrintFormat;
  label: string;
  widthMm: number;
  heightMm: number;
  /** Screen pixels at 96 DPI (used for preview scaling) */
  widthPx: number;
  heightPx: number;
  bleedMm: number;
  designType: PrintDesignType;
}

export const FORMATS: Record<PrintFormat, FormatInfo> = {
  // Menu Cards
  a4:             { key: 'a4',            label: 'A4',            widthMm: 210,  heightMm: 297,  widthPx: 794,  heightPx: 1123, bleedMm: 3, designType: 'menu-card' },
  a3:             { key: 'a3',            label: 'A3',            widthMm: 297,  heightMm: 420,  widthPx: 1123, heightPx: 1587, bleedMm: 3, designType: 'menu-card' },
  tabloid:        { key: 'tabloid',       label: 'Tabloid 11×17"',widthMm: 279,  heightMm: 432,  widthPx: 1055, heightPx: 1634, bleedMm: 3, designType: 'menu-card' },
  // Wall Boards
  a2:             { key: 'a2',            label: 'A2 Wall Board', widthMm: 420,  heightMm: 594,  widthPx: 1587, heightPx: 2245, bleedMm: 5, designType: 'wall-board' },
  a1:             { key: 'a1',            label: 'A1 Wall Board', widthMm: 594,  heightMm: 841,  widthPx: 2245, heightPx: 3179, bleedMm: 5, designType: 'wall-board' },
  '24x36':        { key: '24x36',         label: '24×36" Poster', widthMm: 610,  heightMm: 914,  widthPx: 2306, heightPx: 3456, bleedMm: 5, designType: 'wall-board' },
  // Pamphlets
  dl:             { key: 'dl',            label: 'DL (1/3 A4)',   widthMm: 99,   heightMm: 210,  widthPx: 374,  heightPx: 794,  bleedMm: 3, designType: 'pamphlet' },
  a5:             { key: 'a5',            label: 'A5',            widthMm: 148,  heightMm: 210,  widthPx: 559,  heightPx: 794,  bleedMm: 3, designType: 'pamphlet' },
  a6:             { key: 'a6',            label: 'A6 Flyer',      widthMm: 105,  heightMm: 148,  widthPx: 397,  heightPx: 559,  bleedMm: 3, designType: 'pamphlet' },
  // Pocket Cards
  'business-card':{ key: 'business-card', label: 'Business Card', widthMm: 90,   heightMm: 50,   widthPx: 340,  heightPx: 189,  bleedMm: 2, designType: 'pocket-card' },
  'mini-card':    { key: 'mini-card',     label: 'Mini Card',     widthMm: 85,   heightMm: 55,   widthPx: 321,  heightPx: 208,  bleedMm: 2, designType: 'pocket-card' },
  // Stickers
  'circle-75':    { key: 'circle-75',     label: 'Circle Ø75mm',  widthMm: 75,   heightMm: 75,   widthPx: 283,  heightPx: 283,  bleedMm: 2, designType: 'sticker' },
  'circle-100':   { key: 'circle-100',    label: 'Circle Ø100mm', widthMm: 100,  heightMm: 100,  widthPx: 378,  heightPx: 378,  bleedMm: 2, designType: 'sticker' },
  'square-75':    { key: 'square-75',     label: 'Square 75×75mm',widthMm: 75,   heightMm: 75,   widthPx: 283,  heightPx: 283,  bleedMm: 2, designType: 'sticker' },
  'rect-100x50':  { key: 'rect-100x50',   label: 'Rect 100×50mm', widthMm: 100,  heightMm: 50,   widthPx: 378,  heightPx: 189,  bleedMm: 2, designType: 'sticker' },
};

export const DESIGN_TYPE_FORMATS: Record<PrintDesignType, PrintFormat[]> = {
  'menu-card':   ['a4', 'a3', 'tabloid'],
  'wall-board':  ['a2', 'a1', '24x36'],
  'pamphlet':    ['a5', 'dl', 'a6'],
  'pocket-card': ['business-card', 'mini-card'],
  'sticker':     ['circle-75', 'circle-100', 'square-75', 'rect-100x50'],
};

export const DEFAULT_FORMAT: Record<PrintDesignType, PrintFormat> = {
  'menu-card':   'a4',
  'wall-board':  'a2',
  'pamphlet':    'a5',
  'pocket-card': 'business-card',
  'sticker':     'circle-75',
};

// ─── Colour schemes ───────────────────────────────────────────────────────────

export const COLOR_SCHEMES: Record<ColorSchemeKey, DesignColors & { label: string }> = {
  'classic-black': {
    label: 'Classic Black',
    primary: '#111111', secondary: '#D4AF37', background: '#FFFFFF',
    text: '#111111', textMuted: '#555555', accent: '#D4AF37', border: '#CCCCCC',
  },
  'warm-sunset': {
    label: 'Warm Sunset',
    primary: '#C0392B', secondary: '#E67E22', background: '#FFF8F0',
    text: '#2C3E50', textMuted: '#7F8C8D', accent: '#E67E22', border: '#F5CBA7',
  },
  'ocean-blue': {
    label: 'Ocean Blue',
    primary: '#1565C0', secondary: '#42A5F5', background: '#F0F8FF',
    text: '#0D1B2A', textMuted: '#546E7A', accent: '#42A5F5', border: '#BBDEFB',
  },
  'indian-saffron': {
    label: 'Indian Saffron',
    primary: '#FF6F00', secondary: '#388E3C', background: '#FFFFF0',
    text: '#1A237E', textMuted: '#5D4037', accent: '#FF6F00', border: '#FFE0B2',
  },
  'luxury-gold': {
    label: 'Luxury Gold',
    primary: '#1C1C1C', secondary: '#B8860B', background: '#FFFFF8',
    text: '#0D0D0D', textMuted: '#6B6B6B', accent: '#D4AF37', border: '#E8D5A3',
  },
};

// ─── Font pairings ────────────────────────────────────────────────────────────

export const FONT_PAIRINGS: Record<FontPairingKey, DesignFonts & { label: string; googleFonts: string[] }> = {
  'modern-clean': {
    label: 'Modern Clean',
    heading: 'Poppins', body: 'Inter', price: 'Poppins',
    googleFonts: ['Poppins:300,400,600,700', 'Inter:400,500'],
  },
  'classic-serif': {
    label: 'Classic Serif',
    heading: 'Playfair Display', body: 'Lora', price: 'Cormorant Garamond',
    googleFonts: ['Playfair+Display:400,700', 'Lora:400,500', 'Cormorant+Garamond:400,600'],
  },
  'bold-impact': {
    label: 'Bold Impact',
    heading: 'Oswald', body: 'Roboto', price: 'Oswald',
    googleFonts: ['Oswald:400,600,700', 'Roboto:400,500'],
  },
};

// ─── Template styles ──────────────────────────────────────────────────────────

export interface TemplateInfo {
  key: TemplateStyle;
  label: string;
  description: string;
  defaultColors: ColorSchemeKey;
  defaultFonts: FontPairingKey;
}

export const TEMPLATES: TemplateInfo[] = [
  {
    key: 'modern-minimal',
    label: 'Modern Minimal',
    description: 'Clean, spacious, lots of white space',
    defaultColors: 'classic-black',
    defaultFonts: 'modern-clean',
  },
  {
    key: 'classic-elegant',
    label: 'Classic Elegant',
    description: 'Sophisticated serif typography with ornate details',
    defaultColors: 'luxury-gold',
    defaultFonts: 'classic-serif',
  },
  {
    key: 'bold-colorful',
    label: 'Bold & Colorful',
    description: 'Eye-catching, vibrant, strong typography',
    defaultColors: 'warm-sunset',
    defaultFonts: 'bold-impact',
  },
];

// ─── Gradient presets ─────────────────────────────────────────────────────────

export interface GradientPreset {
  label: string;
  value: string; // CSS gradient
  from: string;  // hex for swatch
  to: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { label: 'Sunset',    value: 'linear-gradient(135deg,#FF6B35,#C0392B)', from: '#FF6B35', to: '#C0392B' },
  { label: 'Ocean',     value: 'linear-gradient(135deg,#1565C0,#00BCD4)', from: '#1565C0', to: '#00BCD4' },
  { label: 'Forest',    value: 'linear-gradient(135deg,#2E7D32,#A5D6A7)', from: '#2E7D32', to: '#A5D6A7' },
  { label: 'Gold',      value: 'linear-gradient(135deg,#F9A825,#E65100)', from: '#F9A825', to: '#E65100' },
  { label: 'Night',     value: 'linear-gradient(135deg,#1C1C1C,#3949AB)', from: '#1C1C1C', to: '#3949AB' },
  { label: 'Rose',      value: 'linear-gradient(135deg,#C2185B,#F48FB1)', from: '#C2185B', to: '#F48FB1' },
  { label: 'Saffron',   value: 'linear-gradient(135deg,#FF6F00,#FDD835)', from: '#FF6F00', to: '#FDD835' },
  { label: 'Teal',      value: 'linear-gradient(135deg,#00695C,#80CBC4)', from: '#00695C', to: '#80CBC4' },
];

// ─── Default customization ────────────────────────────────────────────────────

export function defaultCustomization(style: TemplateStyle): DesignCustomization {
  const tmpl = TEMPLATES.find((t) => t.key === style) ?? TEMPLATES[0];
  const colors = COLOR_SCHEMES[tmpl.defaultColors];
  const fonts = FONT_PAIRINGS[tmpl.defaultFonts];
  return {
    colorScheme: tmpl.defaultColors,
    fontPairing: tmpl.defaultFonts,
    colors: { primary: colors.primary, secondary: colors.secondary, background: colors.background, text: colors.text, textMuted: colors.textMuted, accent: colors.accent, border: colors.border },
    fonts: { heading: fonts.heading, body: fonts.body, price: fonts.price },
    layout: { columns: 2, spacing: 'normal', alignment: 'left', categoryStyle: 'heading' },
    showPrices: true,
    showDescriptions: true,
    showImages: false,
    showQR: true,
    showTagline: true,
    borderStyle: 'simple',
    backgroundType: 'solid',
    backgroundGradient: GRADIENT_PRESETS[0].value,
    logoUrl: undefined,
  };
}
