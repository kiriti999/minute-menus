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
  type JobFlyerContent,
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
  'square-24':     fmt('square-24',       '24×24" Square',      610, 610,  'wall-board',  5),
  dl:              fmt('dl',              'DL (1/3 A4)',        99,  210,  'pamphlet',    3),
  a5:              fmt('a5',              'A5',                 148, 210,  'pamphlet',    3),
  a6:              fmt('a6',              'A6 Flyer',           105, 148,  'pamphlet',    3),
  'business-card': fmt('business-card',   'Business Card',      90,  50,   'pocket-card', 2),
  'mini-card':     fmt('mini-card',       'Mini Card',          85,  55,   'pocket-card', 2),
  'circle-50':     fmt('circle-50',       'Circle Ø50mm',       50,  50,   'sticker',     2, 'circle'),
  'circle-75':     fmt('circle-75',       'Circle Ø75mm',       75,  75,   'sticker',     2, 'circle'),
  'circle-100':    fmt('circle-100',      'Circle Ø100mm',      100, 100,  'sticker',     2, 'circle'),
  'square-50':     fmt('square-50',       'Square 50×50mm',     50,  50,   'sticker',     2, 'square'),
  'square-75':     fmt('square-75',       'Square 75×75mm',     75,  75,   'sticker',     2, 'square'),
  'rect-100x50':   fmt('rect-100x50',     'Rect 100×50mm',      100, 50,   'sticker',     2, 'rectangle'),
};

export const WALL_BOARD_FORMAT_GROUPS: { label: string; formats: PrintFormat[] }[] = [
  { label: 'Landscape (wide wall)', formats: ['a2-landscape', 'a1-landscape', 'a0-landscape', '36x24', '48x36'] },
  { label: 'Portrait (tall wall)', formats: ['a2', 'a1', 'a0', '24x36', '18x24', '36x48'] },
  { label: 'Square', formats: ['square-24'] },
];

export const DESIGN_TYPE_FORMATS: Record<PrintDesignType, PrintFormat[]> = {
  'menu-card':   ['a4', 'a3', 'tabloid'],
  'wall-board':  WALL_BOARD_FORMAT_GROUPS.flatMap((g) => g.formats),
  'pamphlet':    ['a5', 'dl', 'a6'],
  'pocket-card': ['business-card', 'mini-card'],
  'sticker':     ['circle-50', 'circle-75', 'circle-100', 'square-50', 'square-75', 'rect-100x50'],
  'job-flyer':   ['a5', 'dl', 'a6', 'a4'],
};

export const DEFAULT_FORMAT: Record<PrintDesignType, PrintFormat> = {
  'menu-card': 'a4', 'wall-board': 'a2-landscape', 'pamphlet': 'a5',
  'pocket-card': 'business-card', 'sticker': 'circle-75', 'job-flyer': 'a5',
};

export const DEFAULT_JOB_FLYER_CONTENT: JobFlyerContent = {
  roleTitle: 'Part time',
  employmentType: 'part-time',
  timings: '4pm - 11pm',
  salary: '₹12,000 – ₹15,000 / month',
  minAge: '18+ years',
  qualification: '12th pass or Studying degree',
  englishSkill: 'preferred',
  extraNotes: '',
};

// ─── Colour schemes (20) ──────────────────────────────────────────────────────

export const COLOR_SCHEMES: Record<ColorSchemeKey, DesignColors & { label: string }> = {
  'classic-black':    { label: 'Classic Black',    primary: '#000000', secondary: '#FFD700', background: '#FFFFFF', text: '#333333', textMuted: '#666666', accent: '#C9A961', border: '#CCCCCC' },
  'warm-sunset':      { label: 'Warm Sunset',      primary: '#FF6B35', secondary: '#F7931E', background: '#FFF5E1', text: '#2C3E50', textMuted: '#7F8C8D', accent: '#FFB266', border: '#F5CBA7' },
  'ocean-blue':       { label: 'Ocean Blue',       primary: '#0077BE', secondary: '#00A8E8', background: '#F0F8FF', text: '#1A1A1A', textMuted: '#546E7A', accent: '#6DD5FA', border: '#BBDEFB' },
  'forest-green':     { label: 'Forest Green',     primary: '#2D5016', secondary: '#87A96B', background: '#F5F5DC', text: '#1C1C1C', textMuted: '#5D6D4E', accent: '#A4C639', border: '#C5E1A5' },
  'royal-purple':     { label: 'Royal Purple',     primary: '#4A148C', secondary: '#7B1FA2', background: '#F3E5F5', text: '#212121', textMuted: '#6A1B9A', accent: '#BA68C8', border: '#E1BEE7' },
  'spice-red':        { label: 'Spice Red',        primary: '#B71C1C', secondary: '#FF5722', background: '#FFEBEE', text: '#000000', textMuted: '#8D6E63', accent: '#FF8A65', border: '#FFCDD2' },
  'minimalist-gray':  { label: 'Minimalist Gray',  primary: '#424242', secondary: '#757575', background: '#FAFAFA', text: '#212121', textMuted: '#9E9E9E', accent: '#BDBDBD', border: '#E0E0E0' },
  'vintage-brown':    { label: 'Vintage Brown',    primary: '#5D4037', secondary: '#8D6E63', background: '#EFEBE9', text: '#3E2723', textMuted: '#795548', accent: '#A1887F', border: '#D7CCC8' },
  'indian-saffron':   { label: 'Indian Saffron',   primary: '#FF9933', secondary: '#138808', background: '#FFFFFF', text: '#000080', textMuted: '#5D4037', accent: '#FFB366', border: '#FFE0B2' },
  'cafe-latte':       { label: 'Cafe Latte',       primary: '#6F4E37', secondary: '#A0826D', background: '#F5F5DC', text: '#3E2723', textMuted: '#8D6E63', accent: '#C9A689', border: '#D7CCC8' },
  'luxury-gold':      { label: 'Luxury Gold',      primary: '#1C1C1C', secondary: '#D4AF37', background: '#FFFFFF', text: '#000000', textMuted: '#6B6B6B', accent: '#FFD700', border: '#E8D5A3' },
  'fresh-mint':       { label: 'Fresh Mint',       primary: '#00BFA5', secondary: '#1DE9B6', background: '#E0F2F1', text: '#004D40', textMuted: '#00796B', accent: '#64FFDA', border: '#B2DFDB' },
  'berry-blast':      { label: 'Berry Blast',      primary: '#C2185B', secondary: '#E91E63', background: '#FCE4EC', text: '#880E4F', textMuted: '#AD1457', accent: '#F06292', border: '#F8BBD9' },
  'sunset-orange':    { label: 'Sunset Orange',    primary: '#E65100', secondary: '#FF6F00', background: '#FFF3E0', text: '#BF360C', textMuted: '#E64A19', accent: '#FF9800', border: '#FFE0B2' },
  'deep-navy':        { label: 'Deep Navy',        primary: '#0D47A1', secondary: '#1976D2', background: '#E3F2FD', text: '#01579B', textMuted: '#1565C0', accent: '#42A5F5', border: '#BBDEFB' },
  'earthy-olive':     { label: 'Earthy Olive',     primary: '#827717', secondary: '#9E9D24', background: '#F9FBE7', text: '#33691E', textMuted: '#689F38', accent: '#C0CA33', border: '#DCEDC8' },
  'cherry-red':       { label: 'Cherry Red',       primary: '#D32F2F', secondary: '#F44336', background: '#FFEBEE', text: '#B71C1C', textMuted: '#C62828', accent: '#EF5350', border: '#FFCDD2' },
  'slate-modern':     { label: 'Slate Modern',     primary: '#37474F', secondary: '#546E7A', background: '#ECEFF1', text: '#263238', textMuted: '#607D8B', accent: '#78909C', border: '#CFD8DC' },
  'peach-cream':      { label: 'Peach Cream',      primary: '#FF6E40', secondary: '#FFAB91', background: '#FFFAF0', text: '#BF360C', textMuted: '#E64A19', accent: '#FFCCBC', border: '#FFCCBC' },
  'teal-calm':        { label: 'Teal Calm',        primary: '#00796B', secondary: '#26A69A', background: '#E0F2F1', text: '#004D40', textMuted: '#00695C', accent: '#4DB6AC', border: '#B2DFDB' },
  'citrus-punch':     { label: 'Citrus Punch',     primary: '#FF6F00', secondary: '#C0CA33', background: '#FFFDE7', text: '#33260D', textMuted: '#8D6E00', accent: '#E91E63', border: '#FFF176' },
  'garden-fresh':     { label: 'Garden Fresh',     primary: '#33691E', secondary: '#7CB342', background: '#F1F8E9', text: '#1B5E20', textMuted: '#558B2F', accent: '#FF7043', border: '#C5E1A5' },
  'banana-leaf':      { label: 'Banana Leaf',      primary: '#6D1B1B', secondary: '#2E7D32', background: '#FFF8E1', text: '#3E1F1F', textMuted: '#795241', accent: '#C9A227', border: '#E6C79C' },
};

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
  { key: 'modern-minimal',      label: 'Modern Minimal',      description: 'Clean, spacious, white space',       category: 'modern',  defaultColors: 'classic-black',    defaultFonts: 'modern-clean',    previewColors: ['#111', '#fff', '#D4AF37'] },
  { key: 'classic-elegant',     label: 'Classic Elegant',     description: 'Serif typography, ornate details',   category: 'classic', defaultColors: 'luxury-gold',      defaultFonts: 'classic-serif',   previewColors: ['#1C1C1C', '#FFFFF8', '#D4AF37'] },
  { key: 'bold-colorful',       label: 'Bold & Colorful',     description: 'Vibrant, eye-catching',            category: 'casual',  defaultColors: 'warm-sunset',      defaultFonts: 'bold-impact',     previewColors: ['#FF6B35', '#FFF5E1', '#F7931E'] },
  { key: 'rustic-vintage',      label: 'Rustic Vintage',      description: 'Distressed, hand-drawn feel',        category: 'casual',  defaultColors: 'vintage-brown',    defaultFonts: 'rustic-hand',     previewColors: ['#5D4037', '#EFEBE9', '#8D6E63'] },
  { key: 'luxury-premium',      label: 'Luxury Premium',      description: 'Gold accents, elegant spacing',      category: 'premium', defaultColors: 'luxury-gold',      defaultFonts: 'luxury-display',  previewColors: ['#1C1C1C', '#FFFFFF', '#FFD700'] },
  { key: 'street-food-vibes',   label: 'Street Food Vibes',   description: 'Casual Indian street food',         category: 'indian',  defaultColors: 'indian-saffron',   defaultFonts: 'street-playful',  previewColors: ['#FF9933', '#FFFFFF', '#138808'] },
  { key: 'cafe-cozy',           label: 'Cafe Cozy',           description: 'Warm tones, handwritten feel',     category: 'casual',  defaultColors: 'cafe-latte',       defaultFonts: 'cafe-script',     previewColors: ['#6F4E37', '#F5F5DC', '#A0826D'] },
  { key: 'fine-dining-minimal', label: 'Fine Dining Minimal',  description: 'Ultra-minimal, high-end',           category: 'premium', defaultColors: 'minimalist-gray',  defaultFonts: 'fine-dining',     previewColors: ['#424242', '#FAFAFA', '#BDBDBD'] },
  { key: 'fast-food-pop',       label: 'Fast Food Pop',       description: 'Bold, quick-read layout',          category: 'casual',  defaultColors: 'cherry-red',       defaultFonts: 'fast-condensed',  previewColors: ['#D32F2F', '#FFEBEE', '#F44336'] },
  { key: 'ethnic-traditional',  label: 'Ethnic Traditional',  description: 'Cultural patterns, regional',      category: 'indian',  defaultColors: 'indian-saffron',   defaultFonts: 'ethnic-hindi',    previewColors: ['#FF9933', '#FFFFF0', '#138808'] },
  { key: 'juice-bar-fresh',     label: 'Juice Bar Fresh',     description: 'Vibrant citrus, fruit-forward',    category: 'casual',  defaultColors: 'citrus-punch',     defaultFonts: 'street-playful',  previewColors: ['#FF6F00', '#FFFDE7', '#C0CA33'] },
  { key: 'salad-bowl-fresh',    label: 'Salad Bowl Fresh',    description: 'Clean greens, healthy & crisp',    category: 'modern',  defaultColors: 'garden-fresh',     defaultFonts: 'minimal-sans',    previewColors: ['#33691E', '#F1F8E9', '#FF7043'] },
  { key: 'south-indian-mess',   label: 'South Indian Mess',   description: 'Udupi-style, banana-leaf palette', category: 'indian',  defaultColors: 'banana-leaf',      defaultFonts: 'heritage',        previewColors: ['#6D1B1B', '#FFF8E1', '#C9A227'] },
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

export function defaultCustomization(style: TemplateStyle): DesignCustomization {
  const tmpl = TEMPLATES.find((t) => t.key === style) ?? TEMPLATES[0];
  const colors = COLOR_SCHEMES[tmpl.defaultColors];
  const fonts = FONT_PAIRINGS[tmpl.defaultFonts];
  return {
    colorScheme: tmpl.defaultColors,
    fontPairing: tmpl.defaultFonts,
    colors: { primary: colors.primary, secondary: colors.secondary, background: colors.background, text: colors.text, textMuted: colors.textMuted, accent: colors.accent, border: colors.border },
    fonts: { heading: fonts.heading, body: fonts.body, price: fonts.price },
    typography: { ...DEFAULT_TYPOGRAPHY },
    effects: { ...DEFAULT_EFFECTS },
    layout: { columns: 2, spacing: 'normal', alignment: 'left', categoryStyle: 'heading' },
    showPrices: true, showDescriptions: true, showImages: false,
    showQR: true, showTagline: true, borderStyle: 'simple',
    backgroundType: 'solid',
    backgroundGradient: GRADIENT_PRESETS[0].value,
    logoUrl: undefined, logoPosition: 'left',
    colorMode: 'rgb', showBleedGuides: false, includeCropMarks: false,
  };
}
