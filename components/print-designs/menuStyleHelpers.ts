/**
 * Pure style builders for MenuTemplate — keeps TSX cyclomatic complexity low.
 */
import type { BackgroundPattern, Category, DesignColors, DesignCustomization, DesignFonts, RestaurantBranding, TitleStyle } from "@minute-menus/types";
import { resolveFonts, WALL_YELLOW_COLUMN_COLORS } from "../../lib/printDesigns";
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

/** Ultra-wide strips (e.g. 72×23") — width must not drive font size or titles explode. */
export function isUltraWideWall(widthPx: number, heightPx: number): boolean {
  return widthPx > heightPx * 2.2;
}

/**
 * Reference length for wall-board type sizing.
 * Normal boards blend width + height; ultra-wide boards use the short side only.
 */
export function wallBoardRefPx(widthPx: number, heightPx: number): number {
  const shortSide = Math.min(widthPx, heightPx);
  if (isUltraWideWall(widthPx, heightPx)) return shortSide;
  return Math.round((widthPx + shortSide) / 2);
}

/** Scale from printable height — landscape boards are width-rich but height-constrained. */
export function wallBoardFontScale(widthPx: number, heightPx: number): number {
  const h = Math.min(widthPx, heightPx);
  if (h >= 3200) return 1.55;
  if (h >= 2400) return 1.35;
  if (h >= 1700) return 1.15;
  if (h >= 1200) return 1.0;
  return 0.9;
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
  hasLogo = false,
): number {
  const ultra = isUltraWideWall(widthPx, heightPx);
  // Logo headers reserve a bit more than text titles on ultra-wide boards.
  const headerBand = hasLogo
    ? heightPx * (ultra ? 0.16 : 0.14)
    : isLandscape ? heightPx * (ultra ? 0.1 : 0.14) : heightPx * 0.12;
  const headerGap = Math.min(widthPx, heightPx) * (hasLogo ? 0.008 : 0.015);
  let footerBlock = 0;
  if (showQR) footerBlock = wallBoardQrSize(widthPx, heightPx) + 20 + heightPx * 0.01;
  else if (hasFooterSocial) footerBlock = 32 + heightPx * 0.01;
  return Math.max(200, heightPx - pad * 2 - headerBand - headerGap - footerBlock);
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
  const gapRatio = 0.28;
  const lineHeight = 1.12;
  const charsPerLine = Math.max(10, colWidthPx / (baseBodyFs * 0.52));
  const avgLines = Math.min(2.2, Math.max(1.05, maxTitleChars / charsPerLine));
  const blockRatio = avgLines * lineHeight + gapRatio;
  const targetFs = usable / (maxItems * blockRatio);
  // Keep wall text readable at distance — never crush below ~70% of base.
  return Math.min(1, Math.max(0.7, targetFs / baseBodyFs));
}

/** Category columns for wall boards — uses user selection, with sensible defaults per orientation. */
export function wallBoardColumns(widthPx: number, heightPx: number, userCols: number): number {
  const landscape = widthPx > heightPx;
  const defaultCols = landscape ? 5 : (heightPx > widthPx * 1.3 ? 2 : 3);
  return userCols >= 2 ? userCols : defaultCols;
}

/** Fixed vertical rhythm — wall-board dish rows (gap between items ≈ 1.55× body size). */
export const WALL_ITEM_LINE_HEIGHT = 1.2;
export const WALL_ITEM_GAP_RATIO = 1.55;

export function wallBoardItemGap(bodyFs: number): number {
  return Math.max(8, Math.round(bodyFs * WALL_ITEM_GAP_RATIO));
}

export function wallBoardRowPitch(bodyFs: number): number {
  return Math.round(bodyFs * WALL_ITEM_LINE_HEIGHT) + wallBoardItemGap(bodyFs);
}

export function wallBoardHeaderBlock(catFs: number): number {
  // Includes underline padding + space between category name and first dish.
  return Math.round(catFs * 1.15 + catFs * 0.35 + catFs * 0.85 + 4);
}

export function wallBoardSegmentGap(catFs: number, bodyFs = catFs): number {
  // Extra air above a mid-column category start — clearly larger than item-to-item gap.
  const itemGap = wallBoardItemGap(bodyFs);
  return Math.max(itemGap * 2, Math.round(catFs * 1.4));
}

/**
 * How many dish rows fit in a column at fixed spacing (one category header reserved).
 */
export function wallBoardItemsPerColumn(
  contentHeightPx: number,
  bodyFs: number,
  catFs: number,
): number {
  const usable = contentHeightPx - wallBoardHeaderBlock(catFs) - wallBoardSegmentGap(catFs, bodyFs);
  const pitch = wallBoardRowPitch(bodyFs);
  return Math.max(1, Math.floor(usable / pitch));
}

/** Column count from fixed spacing capacity (ignores stretched/even gaps). */
export function wallBoardFlowColumnCount(
  totalItems: number,
  contentHeightPx: number,
  bodyFs: number,
  catFs: number,
  maxCols = 12,
): number {
  if (totalItems <= 0) return 1;
  const perCol = wallBoardItemsPerColumn(contentHeightPx, bodyFs, catFs);
  return Math.min(maxCols, Math.max(1, Math.ceil(totalItems / perCol)));
}

/**
 * Actual grid column count — honors the user's Columns control when ≥ 2,
 * otherwise falls back to category count (legacy).
 */
export function resolveWallColumns(categoryCount: number, userCols: number): number {
  if (userCols >= 2) return userCols;
  return Math.max(1, categoryCount);
}

export type WallBoardColumnSegment = {
  categoryId: string;
  title: string;
  items: Category["items"];
  continued: boolean;
};

export type WallBoardColumn = {
  segments: WallBoardColumnSegment[];
  itemCount: number;
};

function segmentHeight(
  itemCount: number,
  bodyFs: number,
  catFs: number,
  includeSegmentGap: boolean,
  showHeader: boolean,
): number {
  const itemsH = itemCount * wallBoardRowPitch(bodyFs);
  const gap = includeSegmentGap ? wallBoardSegmentGap(catFs, bodyFs) : 0;
  const header = showHeader ? wallBoardHeaderBlock(catFs) : 0;
  return header + itemsH + gap;
}

export function wallBoardPackedItemCount(columns: WallBoardColumn[]): number {
  return columns.reduce((n, col) => n + col.itemCount, 0);
}

/**
 * Pack left→right by fixed vertical capacity (not equal item counts).
 * Continuations omit category headers (no "(cont.)" rows) to free space.
 */
export function packWallBoardColumns(
  categories: Category[],
  columnCount: number,
  contentHeightPx: number,
  bodyFs: number,
  catFs: number,
): WallBoardColumn[] {
  const cols = Math.max(1, columnCount);
  const columns: WallBoardColumn[] = Array.from({ length: cols }, () => ({
    segments: [],
    itemCount: 0,
  }));
  const totalItems = categories.reduce((n, cat) => n + cat.items.length, 0);
  if (totalItems === 0) return columns;

  let colIdx = 0;
  /** Soft cap so fixed column counts (e.g. 4) fill evenly instead of left-packing into 3. */
  const softCap = Math.ceil(totalItems / cols);

  const columnUsedH = (col: WallBoardColumn): number => {
    let h = 0;
    col.segments.forEach((seg, i) => {
      h += segmentHeight(seg.items.length, bodyFs, catFs, i > 0, !seg.continued);
    });
    return h;
  };

  const advance = (): boolean => {
    if (colIdx >= cols - 1) return false;
    colIdx += 1;
    return true;
  };

  for (const cat of categories) {
    let start = 0;
    while (start < cat.items.length) {
      const remaining = cat.items.length - start;
      const continued = start > 0;
      // Move on once this column hit its share (keeps later categories visible).
      if (columns[colIdx].itemCount >= softCap && advance()) continue;

      const usedH = columnUsedH(columns[colIdx]);
      // Continuations only need a small gap if the column already has content.
      const segGap =
        columns[colIdx].segments.length > 0
          ? continued
            ? wallBoardItemGap(bodyFs)
            : wallBoardSegmentGap(catFs, bodyFs)
          : 0;
      const headerH = continued ? 0 : wallBoardHeaderBlock(catFs);
      const pitch = wallBoardRowPitch(bodyFs);
      const roomPx = contentHeightPx - usedH - segGap - headerH;
      let roomItems = Math.floor(roomPx / pitch);
      const softRoom = softCap - columns[colIdx].itemCount;
      if (colIdx < cols - 1) roomItems = Math.min(roomItems, Math.max(0, softRoom));

      if (roomItems < 1) {
        if (advance()) continue;
        // Last column is full — stop rather than paint a header with no visible items.
        break;
      }

      // Prefer next column over a 1-item category start at the bottom of a filled column.
      if (
        start === 0 &&
        roomItems === 1 &&
        remaining > 1 &&
        columns[colIdx].itemCount > 0 &&
        advance()
      ) {
        continue;
      }

      const take = Math.min(remaining, roomItems);
      if (take < 1) break;

      columns[colIdx].segments.push({
        categoryId: cat.id,
        title: cat.title,
        items: cat.items.slice(start, start + take),
        continued,
      });
      columns[colIdx].itemCount += take;
      start += take;
    }
  }
  return columns
    .map((col) => ({
      ...col,
      segments: col.segments.filter((seg) => seg.items.length > 0),
    }))
    .filter((col) => col.itemCount > 0 && col.segments.length > 0);
}

/** Shrink wall type until every dish packs into the board (or floor is hit). */
export function fitWallBoardType(opts: {
  categories: Category[];
  columnCount: number;
  contentHeightPx: number;
  bodyFs: number;
  catFs: number;
}): { bodyFs: number; catFs: number; packed: WallBoardColumn[] } {
  const totalItems = opts.categories.reduce((n, cat) => n + cat.items.length, 0);
  let bodyFs = opts.bodyFs;
  let catFs = opts.catFs;
  let packed = packWallBoardColumns(
    opts.categories,
    opts.columnCount,
    opts.contentHeightPx,
    bodyFs,
    catFs,
  );
  for (let i = 0; i < 16 && wallBoardPackedItemCount(packed) < totalItems; i++) {
    bodyFs = Math.max(11, Math.round(bodyFs * 0.92));
    catFs = Math.max(12, Math.round(catFs * 0.92));
    packed = packWallBoardColumns(
      opts.categories,
      opts.columnCount,
      opts.contentHeightPx,
      bodyFs,
      catFs,
    );
  }
  return { bodyFs, catFs, packed };
}

export function wallBoardColumnFontScale(widthPx: number, cols: number): number {
  const colWidth = widthPx / Math.max(cols, 1);
  if (colWidth < 220) return 0.72;
  if (colWidth < 300) return 0.85;
  if (colWidth < 400) return 0.95;
  if (colWidth < 520) return 1.05;
  return 1.15;
}

export function scaledBodyFsWall(widthPx: number, heightPx: number, customization: DesignCustomization, cols = 1): number {
  const ref = wallBoardRefPx(widthPx, heightPx);
  const wideBoost = isUltraWideWall(widthPx, heightPx) ? 1.25 : 1;
  const base = Math.round(scaledBodyFs(ref, customization) * wallBoardFontScale(widthPx, heightPx) * 1.2 * wideBoost);
  return Math.max(14, Math.round(base * wallBoardColumnFontScale(widthPx, cols)));
}

export function scaledDescFsWall(widthPx: number, heightPx: number, customization: DesignCustomization, cols = 1): number {
  const ref = wallBoardRefPx(widthPx, heightPx);
  const wideBoost = isUltraWideWall(widthPx, heightPx) ? 1.2 : 1;
  const base = Math.round(scaledDescFs(ref, customization) * wallBoardFontScale(widthPx, heightPx) * 1.15 * wideBoost);
  return Math.max(12, Math.round(base * wallBoardColumnFontScale(widthPx, cols)));
}

export function scaledCatFsWall(widthPx: number, heightPx: number, customization: DesignCustomization, cols = 1): number {
  const ref = wallBoardRefPx(widthPx, heightPx);
  const wideBoost = isUltraWideWall(widthPx, heightPx) ? 1.2 : 1;
  const base = Math.round(scaledCatFs(ref, customization) * wallBoardFontScale(widthPx, heightPx) * 1.15 * wideBoost);
  return Math.max(16, Math.round(base * wallBoardColumnFontScale(widthPx, cols)));
}

export function scaledHeadingFsWall(widthPx: number, heightPx: number, customization: DesignCustomization): number {
  const ref = wallBoardRefPx(widthPx, heightPx);
  const raw = Math.round(scaledHeadingFs(ref, customization) * wallBoardFontScale(widthPx, heightPx));
  // Cap title so ultra-wide boards keep most of the height for menu columns.
  const cap = Math.round(heightPx * (isUltraWideWall(widthPx, heightPx) ? 0.08 : 0.12));
  return Math.max(18, Math.min(raw, cap));
}

export function headingWeight(customization: DesignCustomization): number {
  return HEADING_WEIGHT_MAP[customization.typography.headingWeight];
}

export function effectiveFonts(customization: DesignCustomization): DesignFonts {
  return resolveFonts(customization);
}

/** Quoted font-family for inline styles — avoids canvas export falling back to Times. */
export function fontFamilyCss(family: string, fallback: "sans-serif" | "serif" | "cursive" = "sans-serif"): string {
  const name = family.replace(/^["']|["']$/g, "").split(",")[0]?.trim() || family;
  return `"${name}", ${fallback}`;
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

/** Page columns for menu-card / pamphlet — allow 2-up on DL/A5, not only wide A4. */
export function standardMenuPageColumns(widthPx: number, userColumns: number): number {
  if (userColumns < 2) return 1;
  return widthPx >= 340 ? 2 : 1;
}

function estimateCategoryBlockHeight(
  itemCount: number,
  colWidth: number,
  customization: DesignCustomization,
  scale: number,
  showDescriptions: boolean,
): number {
  const bfs = Math.max(6, Math.round(scaledBodyFs(colWidth, customization) * scale));
  const dfs = Math.max(5, Math.round(scaledDescFs(colWidth, customization) * scale));
  const cfs = Math.max(7, Math.round(scaledCatFs(colWidth, customization) * scale));
  const gap =
    customization.layout.spacing === "compact"
      ? Math.round(colWidth * 0.008 * scale)
      : Math.round(colWidth * 0.016 * scale);
  const catMargin = Math.round(colWidth * 0.04 * scale);
  const header = Math.round(cfs * 1.7);
  const row = bfs + (showDescriptions ? dfs + 2 : 0) + gap;
  return header + itemCount * row + catMargin;
}

/** Tallest column after balancing categories left→right. */
export function estimateStandardMenuHeight(
  menuItems: Category[],
  widthPx: number,
  pageColumns: number,
  customization: DesignCustomization,
  scale: number,
  showDescriptions: boolean,
): number {
  const colWidth = menuColumnWidth(widthPx, pageColumns);
  const heights = menuItems.map((cat) =>
    estimateCategoryBlockHeight(cat.items.length, colWidth, customization, scale, showDescriptions),
  );
  if (pageColumns <= 1) return heights.reduce((a, b) => a + b, 0);
  const colH = Array.from({ length: pageColumns }, () => 0);
  for (const h of heights) {
    const i = colH.indexOf(Math.min(...colH));
    colH[i] += h;
  }
  return Math.max(...colH);
}

/**
 * Shrink type (and drop descriptions if needed) so every dish fits the page.
 * Prevents overflow:hidden from clipping the whole menu on pamphlets.
 */
export function fitStandardMenuContent(opts: {
  menuItems: Category[];
  widthPx: number;
  availableHeight: number;
  pageColumns: number;
  customization: DesignCustomization;
}): { scale: number; showDescriptions: boolean } {
  const { menuItems, widthPx, availableHeight, pageColumns, customization } = opts;
  let showDescriptions = customization.showDescriptions;
  let scale = 1;
  for (let i = 0; i < 14; i++) {
    const h = estimateStandardMenuHeight(
      menuItems,
      widthPx,
      pageColumns,
      customization,
      scale,
      showDescriptions,
    );
    if (h <= availableHeight) return { scale, showDescriptions };
    if (showDescriptions && i >= 1) {
      showDescriptions = false;
      continue;
    }
    scale = Math.max(0.48, Number((scale * 0.9).toFixed(3)));
  }
  return { scale, showDescriptions };
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

/** Soft yellow panels with black ink — keeps equal column shapes on wall-yellow boards. */
export { WALL_YELLOW_COLUMN_COLORS };

/** Returns custom column colors if provided, otherwise generates from color scheme. */
export function wallColumnPalette(colors: DesignColors, customColors?: string[]): string[] {
  if (customColors && customColors.length > 0) return customColors;
  // Near-black schemes would otherwise paint every panel black and hide the yellow field.
  const isWallYellow =
    colors.background.toLowerCase() === '#ffd200'
    && colors.primary.toLowerCase() === '#111111';
  if (isWallYellow) return [...WALL_YELLOW_COLUMN_COLORS];
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
