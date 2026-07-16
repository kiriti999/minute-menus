/**
 * Pure style builders for MenuTemplate — keeps TSX cyclomatic complexity low.
 */
import type { BackgroundPattern, DesignColors, DesignCustomization, DesignFonts, RestaurantBranding, TitleStyle } from "@minute-menus/types";
import { resolveFonts } from "../../lib/printDesigns";
import {
  BODY_SIZE_SCALE,
  CORNER_RADIUS_MAP,
  HEADING_SIZE_SCALE,
  HEADING_WEIGHT_MAP,
  SHADOW_MAP,
  type TemplateVisualConfig,
} from "../../lib/templateConfig";

type CSS = Record<string, string | number | undefined>;

export function scaledBodyFs(widthPx: number, customization: DesignCustomization): number {
  const base = Math.max(9, Math.round(widthPx * 0.014));
  return Math.round(base * BODY_SIZE_SCALE[customization.typography.bodySize]);
}

export function scaledDescFs(widthPx: number, customization: DesignCustomization): number {
  return Math.max(8, Math.round(scaledBodyFs(widthPx, customization) * 0.8));
}

export function scaledCatFs(widthPx: number, customization: DesignCustomization): number {
  const base = Math.max(10, Math.round(widthPx * 0.018));
  return Math.round(base * BODY_SIZE_SCALE[customization.typography.bodySize]);
}

export function scaledHeadingFs(widthPx: number, customization: DesignCustomization): number {
  const base = Math.round(widthPx * 0.055);
  return Math.round(base * HEADING_SIZE_SCALE[customization.typography.headingSize]);
}

/** Scale from printable height — landscape boards are width-rich but height-constrained. */
export function wallBoardFontScale(widthPx: number, heightPx: number): number {
  const h = Math.min(widthPx, heightPx);
  if (h >= 3200) return 1.3;
  if (h >= 2400) return 1.1;
  if (h >= 1700) return 0.92;
  if (h >= 1200) return 0.8;
  return 0.72;
}

/** QR size for wall boards — keyed to the short side so landscape boards stay balanced. */
export function wallBoardQrSize(widthPx: number, heightPx: number): number {
  return Math.max(48, Math.round(Math.min(widthPx, heightPx) * 0.09));
}

/** Vertical space left for category columns after header/footer. */
export function wallBoardContentHeight(
  heightPx: number,
  widthPx: number,
  pad: number,
  isLandscape: boolean,
  showQR: boolean,
  hasFooterSocial: boolean,
): number {
  const headerBand = isLandscape ? heightPx * 0.14 : heightPx * 0.12;
  const headerGap = Math.min(widthPx, heightPx) * 0.015;
  const footerGap = heightPx * 0.01;
  let footerBlock = 24;
  if (showQR) footerBlock += wallBoardQrSize(widthPx, heightPx) + 20;
  else if (hasFooterSocial) footerBlock += 32;
  return Math.max(200, heightPx - pad * 2 - headerBand - headerGap - footerGap - footerBlock);
}

/** Shrink fonts when the busiest column has many items for the available height. */
export function wallBoardDensityScale(
  maxItems: number,
  contentHeightPx: number,
  baseBodyFs: number,
  maxTitleChars = 0,
  colWidthPx = 400,
): number {
  if (maxItems <= 0) return 1;
  const catHeaderPx = Math.max(52, baseBodyFs * 2.1);
  const usable = contentHeightPx - catHeaderPx;
  const gapRatio = 0.36;
  const lineHeight = 1.15;
  const charsPerLine = Math.max(10, colWidthPx / (baseBodyFs * 0.55));
  const avgLines = Math.min(2.4, Math.max(1.1, maxTitleChars / charsPerLine));
  const blockRatio = avgLines * lineHeight + gapRatio;
  const targetFs = usable / (maxItems * blockRatio);
  return Math.min(1, Math.max(0.48, targetFs / baseBodyFs));
}

/** Category columns for wall boards — uses user selection, with sensible defaults per orientation. */
export function wallBoardColumns(widthPx: number, heightPx: number, userCols: number): number {
  const landscape = widthPx > heightPx;
  const defaultCols = landscape ? 4 : (heightPx > widthPx * 1.3 ? 2 : 3);
  return userCols >= 2 ? userCols : defaultCols;
}

/**
 * Actual grid column count — never exceeds category count, and prefers a count that
 * leaves fewer empty cells in the last row (avoids sparse landscape boards).
 */
export function optimalWallColumns(categoryCount: number, maxCols: number): number {
  const n = Math.max(1, categoryCount);
  const cap = Math.max(1, Math.min(maxCols, n));
  if (n <= cap) return n;
  const waste = (cols: number) => {
    const rem = n % cols;
    return rem === 0 ? 0 : cols - rem;
  };
  const wasteAtCap = waste(cap);
  if (cap <= 2) return cap;
  const wasteLower = waste(cap - 1);
  return wasteLower < wasteAtCap ? cap - 1 : cap;
}

export function wallBoardColumnFontScale(widthPx: number, cols: number): number {
  const colWidth = widthPx / Math.max(cols, 1);
  if (colWidth < 220) return 0.55;
  if (colWidth < 300) return 0.68;
  if (colWidth < 400) return 0.82;
  if (colWidth < 520) return 0.92;
  return 1;
}

export function scaledBodyFsWall(widthPx: number, heightPx: number, customization: DesignCustomization, cols = 1): number {
  const base = Math.round(scaledBodyFs(widthPx, customization) * wallBoardFontScale(widthPx, heightPx));
  return Math.max(8, Math.round(base * wallBoardColumnFontScale(widthPx, cols)));
}

export function scaledDescFsWall(widthPx: number, heightPx: number, customization: DesignCustomization, cols = 1): number {
  const base = Math.round(scaledDescFs(widthPx, customization) * wallBoardFontScale(widthPx, heightPx));
  return Math.max(7, Math.round(base * wallBoardColumnFontScale(widthPx, cols)));
}

export function scaledCatFsWall(widthPx: number, heightPx: number, customization: DesignCustomization, cols = 1): number {
  const base = Math.round(scaledCatFs(widthPx, customization) * wallBoardFontScale(widthPx, heightPx));
  return Math.max(9, Math.round(base * wallBoardColumnFontScale(widthPx, cols)));
}

export function scaledHeadingFsWall(widthPx: number, heightPx: number, customization: DesignCustomization): number {
  return Math.round(scaledHeadingFs(widthPx, customization) * wallBoardFontScale(widthPx, heightPx));
}

export function headingWeight(customization: DesignCustomization): number {
  return HEADING_WEIGHT_MAP[customization.typography.headingWeight];
}

export function effectiveFonts(customization: DesignCustomization): DesignFonts {
  return resolveFonts(customization);
}

export function baseBackground(customization: DesignCustomization): string {
  if (customization.backgroundType === 'gradient' && customization.backgroundGradient) {
    return customization.backgroundGradient;
  }
  if (customization.backgroundType === 'image' && customization.backgroundImageUrl) {
    return customization.colors.background;
  }
  return customization.colors.background;
}

type CSS = Record<string, string | number | undefined>;

export function patternOverlay(pattern: BackgroundPattern, borderColor: string): CSS {
  if (pattern === 'dots') {
    return { backgroundImage: `radial-gradient(${borderColor}44 1px, transparent 1px)`, backgroundSize: '14px 14px' };
  }
  if (pattern === 'lines') {
    return { backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 11px, ${borderColor}22 11px, ${borderColor}22 12px)` };
  }
  return {
    backgroundImage: `linear-gradient(45deg, ${borderColor}18 25%, transparent 25%, transparent 75%, ${borderColor}18 75%)`,
    backgroundSize: '18px 18px',
  };
}

export function outerBorderCss(visual: TemplateVisualConfig, customization: DesignCustomization): string {
  const { colors } = customization;
  const style = customization.borderStyle !== 'none' ? customization.borderStyle : visual.outerBorder;
  if (style === 'double') return `6px double ${colors.accent}`;
  if (style === 'decorative') return `4px solid ${colors.accent}`;
  if (style === 'dashed' || visual.outerBorder === 'dashed') return `3px dashed ${colors.secondary}`;
  if (style === 'simple' || visual.outerBorder === 'simple') return `2px solid ${colors.border}`;
  return 'none';
}

export function containerRadius(customization: DesignCustomization): number {
  return CORNER_RADIUS_MAP[customization.effects.cornerRadius];
}

export function containerShadow(customization: DesignCustomization): string {
  return SHADOW_MAP[customization.effects.shadow];
}

export function textTransformCss(customization: DesignCustomization): 'none' | 'uppercase' | 'capitalize' {
  return customization.typography.textTransform;
}

export function logoAlign(position: DesignCustomization['logoPosition']): 'flex-start' | 'center' | 'flex-end' {
  if (position === 'center') return 'center';
  if (position === 'right') return 'flex-end';
  return 'flex-start';
}

const TITLE_STYLE_FONTS: Record<Exclude<TitleStyle, 'classic'>, string> = {
  cursive: 'Dancing Script',
  bold: 'Anton',
  elegant: 'Playfair Display',
};

/** Slug-style names (fresh-and-fusion) → readable title text. */
export function formatPrintDisplayName(name: string, textTransform: DesignCustomization['typography']['textTransform']): string {
  const cleaned = name.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Restaurant';
  if (textTransform === 'uppercase') return cleaned.toUpperCase();
  if (textTransform === 'capitalize') {
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return cleaned;
}

/** Split "Fresh & Fusion" / "fresh-and-fusion" into serif lead + script trail for name boards. */
export function splitNameBoardTitle(name: string): { lead: string; script: string } | null {
  const cleaned = name.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  const match = cleaned.match(/^(.+?)\s+(?:&|and)\s+(.+)$/i);
  if (!match) return null;
  const script = match[2].trim().replace(/\b\w/g, (c) => c.toUpperCase());
  return { lead: match[1].trim().toUpperCase(), script };
}

export function titleFontFamily(customization: DesignCustomization): string {
  const style = customization.typography.titleStyle ?? 'classic';
  if (style === 'classic') return effectiveFonts(customization).heading;
  return TITLE_STYLE_FONTS[style];
}

export function titleStyleExtras(customization: DesignCustomization): CSS {
  const style = customization.typography.titleStyle ?? 'classic';
  if (style === 'cursive') return { fontStyle: 'normal', letterSpacing: '0.02em' };
  if (style === 'bold') return { fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase' };
  if (style === 'elegant') return { fontWeight: 400, letterSpacing: '0.08em', fontStyle: 'italic' };
  return {};
}

/** Usable width per column in multi-column menu / pamphlet layouts. */
export function menuColumnWidth(widthPx: number, pageColumns: number): number {
  const pad = Math.round(widthPx * 0.06);
  const gap = Math.round(widthPx * 0.025);
  const inner = widthPx - pad * 2;
  if (pageColumns <= 1) return inner;
  return (inner - gap * (pageColumns - 1)) / pageColumns;
}

/** QR size for menu card / wall board footers — large enough to scan reliably. */
export function footerQrSize(widthPx: number): number {
  return Math.max(56, Math.round(widthPx * 0.12));
}

export const MENU_QR_LABEL = "Scan to order";

/** Footer social line — Instagram/website only (no phone on menu cards or pamphlets). */
export function menuFooterContactLine(branding: RestaurantBranding): string {
  return [branding.instagram, branding.website].filter(Boolean).join(" · ");
}

export function menuQrLabelFs(widthPx: number, customization: DesignCustomization): number {
  return Math.max(10, Math.round(scaledBodyFs(widthPx, customization) * 0.95));
}

/** QR size for pocket cards and compact stickers (~10–11mm at 96dpi export). */
export function compactQrSize(widthPx: number, heightPx: number): number {
  const minDim = Math.min(widthPx, heightPx);
  return Math.max(36, Math.min(46, Math.round(minDim * 0.20)));
}

/** Space to reserve above absolute footers so menu content does not overlap. */
export function menuFooterReserveHeight(
  widthPx: number,
  heightPx: number,
  footerVariant: TemplateVisualConfig['footer'],
  showQR: boolean,
): number {
  const qrSize = footerQrSize(widthPx);
  if (footerVariant === 'strip') return qrSize + 24;
  if (showQR) return qrSize + Math.round(heightPx * 0.04) + 28;
  return Math.round(heightPx * 0.06);
}

/** Font scale for pocket cards and small stickers. */
export function compactMenuScale(widthPx: number, heightPx: number): number {
  const minDim = Math.min(widthPx, heightPx);
  if (minDim < 200) return 0.55;
  if (minDim < 280) return 0.72;
  return 0.88;
}

export function compactMaxItemsPerCategory(widthPx: number, heightPx: number): number {
  const area = widthPx * heightPx;
  if (area < 45_000) return 3;
  if (area < 80_000) return 5;
  return 8;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Blends two hex colors — used to derive a 4th wall-board column tone from the palette. */
export function mixHexColors(a: string, b: string, weight = 0.5): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const mix = (x: number, y: number) => Math.round(x * (1 - weight) + y * weight);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Chooses readable foreground text (near-black or white) for a given background color. */
export function contrastTextColor(bgHex: string): string {
  const [r, g, b] = hexToRgb(bgHex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1A1A1A' : '#FFFFFF';
}

function relativeLuminance(hex: string): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** High-contrast price ink — never washed gold/pastel accents on light paper. */
export function priceColor(colors: DesignColors): string {
  const bg = colors.background;
  for (const candidate of [colors.primary, colors.text, '#1A1A1A']) {
    if (contrastRatio(candidate, bg) >= 4.5) return candidate;
  }
  return contrastTextColor(bg);
}

/** Slightly larger than body so prices stay legible in multi-column layouts. */
export function scaledPriceFs(widthPx: number, bodyFs: number): number {
  return Math.max(bodyFs + 1, Math.round(widthPx * 0.016), 10);
}

/** Default 5-color rotation for wall-board category blocks, driven by the active color scheme. */
export function defaultColumnPalette(colors: DesignColors): string[] {
  return [
    colors.primary,
    colors.secondary,
    colors.accent,
    mixHexColors(colors.primary, colors.secondary, 0.5),
    mixHexColors(colors.secondary, colors.accent, 0.5),
  ];
}

/** Returns custom column colors if provided, otherwise generates from color scheme. */
export function wallColumnPalette(colors: DesignColors, customColors?: string[]): string[] {
  if (customColors && customColors.length > 0) return customColors;
  return defaultColumnPalette(colors);
}


export function categoryHeadingStyle(
  variant: TemplateVisualConfig['category'],
  customization: DesignCustomization,
  catFs: number,
  fonts: DesignFonts,
): CSS {
  const { colors } = customization;
  const base: CSS = {
    fontFamily: fonts.heading,
    fontSize: catFs,
    fontWeight: 700,
    marginBottom: Math.round(catFs * 0.5),
    letterSpacing: '0.04em',
  };
  if (variant === 'filled-banner') {
    return { ...base, color: colors.background, backgroundColor: colors.primary, padding: `${Math.round(catFs * 0.3)}px ${Math.round(catFs * 0.75)}px` };
  }
  if (variant === 'pill') {
    return { ...base, color: colors.background, backgroundColor: colors.primary, borderRadius: 999, padding: '3px 12px', display: 'inline-block' };
  }
  if (variant === 'left-accent') {
    return { ...base, color: colors.primary, borderLeft: `3px solid ${colors.accent}`, padding: '2px 0 2px 8px' };
  }
  if (variant === 'dashed-rustic') {
    return { ...base, color: colors.primary, borderBottom: `2px dashed ${colors.secondary}`, paddingBottom: 4 };
  }
  if (variant === 'gold-rule') {
    return { ...base, color: colors.primary, borderBottom: `1px solid ${colors.accent}`, paddingBottom: 4 };
  }
  return { ...base, color: colors.primary, borderBottom: `1px solid ${colors.border}`, textTransform: 'uppercase', letterSpacing: '0.12em' };
}
