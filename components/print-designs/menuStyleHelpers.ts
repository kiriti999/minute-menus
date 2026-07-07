/**
 * Pure style builders for MenuTemplate — keeps TSX cyclomatic complexity low.
 */
import type { BackgroundPattern, DesignColors, DesignCustomization, DesignFonts } from "@minute-menus/types";
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

export function wallBoardFontScale(widthPx: number, heightPx: number): number {
  const area = widthPx * heightPx;
  if (area > 4_000_000) return 1.45;
  if (area > 2_500_000) return 1.3;
  if (widthPx > heightPx) return 1.2;
  return 1.15;
}

/** Category columns for wall boards — uses user selection, with sensible defaults per orientation. */
export function wallBoardColumns(widthPx: number, heightPx: number, userCols: number): number {
  const landscape = widthPx > heightPx;
  const defaultCols = landscape ? 5 : (heightPx > widthPx * 1.3 ? 2 : 3);
  return userCols >= 2 ? userCols : defaultCols;
}

export function scaledBodyFsWall(widthPx: number, heightPx: number, customization: DesignCustomization): number {
  return Math.round(scaledBodyFs(widthPx, customization) * wallBoardFontScale(widthPx, heightPx));
}

export function scaledDescFsWall(widthPx: number, heightPx: number, customization: DesignCustomization): number {
  return Math.round(scaledDescFs(widthPx, customization) * wallBoardFontScale(widthPx, heightPx));
}

export function scaledCatFsWall(widthPx: number, heightPx: number, customization: DesignCustomization): number {
  return Math.round(scaledCatFs(widthPx, customization) * wallBoardFontScale(widthPx, heightPx));
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

/** Space to reserve above absolute footers so menu content does not overlap. */
export function menuFooterReserveHeight(
  widthPx: number,
  heightPx: number,
  footerVariant: TemplateVisualConfig['footer'],
  showQR: boolean,
): number {
  const qrSize = Math.round(widthPx * 0.06);
  if (footerVariant === 'strip') return qrSize + 24;
  if (showQR) return qrSize + Math.round(heightPx * 0.04) + 20;
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
