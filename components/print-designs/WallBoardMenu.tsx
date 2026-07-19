/**
 * WallBoardMenu — orientation-aware layout for portrait, landscape, and square wall boards.
 */
import type { Category, DesignCustomization, RestaurantBranding, TemplateStyle } from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import { DEFAULT_COLUMN_BORDER_COLOR, type FormatInfo } from "../../lib/printDesigns";
import { wallBoardDisplayName } from "../../lib/wallBoardDishTitle";
import { TEMPLATE_VISUALS } from "../../lib/templateConfig";
import {
  baseBackground,
  containerRadius,
  containerShadow,
  contrastTextColor,
  effectiveFonts,
  fontFamilyCss,
  formatPrintDisplayName,
  headingWeight,
  hexToRgba,
  logoAlign,
  fitWallBoardType,
  outerBorderCss,
  patternInkColor,
  patternOverlay,
  scaledBodyFsWall,
  scaledCatFsWall,
  scaledDescFsWall,
  scaledHeadingFsWall,
  splitNameBoardTitle,
  textTransformCss,
  titleFontFamily,
  titleStyleExtras,
  wallBoardColumnQrSize,
  wallBoardContentHeight,
  wallBoardFlowColumnCount,
  wallBoardItemGap,
  wallBoardSegmentGap,
  wallColumnPalette,
  WALL_ITEM_LINE_HEIGHT,
  type WallBoardColumn,
} from "./menuStyleHelpers";

export interface WallBoardMenuProps {
  style: TemplateStyle;
  customization: DesignCustomization;
  branding: RestaurantBranding;
  menuItems: Category[];
  fmt: FormatInfo;
  widthPx: number;
  heightPx: number;
  siteUrl: string;
}

function Logo({ url, height }: { url?: string; height: number }) {
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Logo"
      style={{
        height,
        maxHeight: height,
        width: 'auto',
        maxWidth: '70%',
        objectFit: 'contain',
        objectPosition: 'center',
        display: 'block',
        flexShrink: 0,
      }}
    />
  );
}

function NameBoardTitle({ name, tagline, showTagline, color, muted, hfs, dfs }: {
  name: string; tagline?: string; showTagline: boolean; color: string; muted: string; hfs: number; dfs: number;
}) {
  const parts = splitNameBoardTitle(name);
  return (
    <div style={{ textAlign: 'center' }}>
      {parts ? (
        <div style={{
          display: 'flex', flexWrap: 'nowrap', alignItems: 'baseline', justifyContent: 'center',
          gap: Math.round(hfs * 0.14), whiteSpace: 'nowrap', lineHeight: 1,
        }}>
          <span style={{ fontFamily: fontFamilyCss('Playfair Display', 'serif'), fontSize: Math.round(hfs * 0.78), fontWeight: 700, color, letterSpacing: '0.1em' }}>{parts.lead}</span>
          <span style={{ fontFamily: fontFamilyCss('Playfair Display', 'serif'), fontSize: Math.round(hfs * 0.55), fontWeight: 700, color }}>&</span>
          <span style={{ fontFamily: fontFamilyCss('Great Vibes', 'cursive'), fontSize: Math.round(hfs * 1.05), fontWeight: 400, color }}>{parts.script}</span>
        </div>
      ) : (
        <div style={{ fontFamily: fontFamilyCss('Playfair Display', 'serif'), fontSize: hfs, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{name}</div>
      )}
      {showTagline && tagline && (
        <div style={{ fontFamily: fontFamilyCss('Montserrat'), fontSize: dfs, fontWeight: 600, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: Math.round(dfs * 0.7) }}>{tagline}</div>
      )}
    </div>
  );
}

function WallHeader({ style, customization, branding, widthPx, heightPx, isLandscape, pad }: {
  style: TemplateStyle; customization: DesignCustomization; branding: RestaurantBranding;
  widthPx: number; heightPx: number; isLandscape: boolean; pad: number;
}) {
  const visual = TEMPLATE_VISUALS[style];
  const { colors, showTagline, logoUrl, logoPosition } = customization;
  const hasLogo = Boolean(logoUrl);
  const hfs = scaledHeadingFsWall(widthPx, heightPx, customization);
  const dfs = scaledDescFsWall(widthPx, heightPx, customization);
  const align = logoAlign(logoPosition);
  const ultraWide = widthPx > heightPx * 2.2;
  const bandH = isLandscape ? Math.round(heightPx * (ultraWide ? 0.1 : 0.14)) : Math.round(heightPx * 0.12);
  const headerGap = Math.round(Math.min(widthPx, heightPx) * (hasLogo ? 0.008 : 0.015));
  const displayName = formatPrintDisplayName(branding.name, customization.typography.textTransform);
  const titleFont = titleFontFamily(customization);
  const titleExtras = titleStyleExtras(customization);
  const tagline = showTagline && branding.tagline ? branding.tagline : null;
  // Readable logo without eating the column band on ultra-wide boards.
  const logoH = Math.round(Math.min(heightPx * (ultraWide ? 0.16 : 0.13), widthPx * 0.12));

  if (visual.header === 'name-board') {
    return (
      <div style={{
        marginBottom: headerGap, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: hasLogo ? 'flex-start' : 'center', gap: hasLogo ? 2 : 6,
        ...(hasLogo ? {} : { minHeight: Math.round(bandH * 0.9) }),
      }}>
        {hasLogo ? (
          <>
            <Logo url={logoUrl} height={logoH} />
            {tagline && (
              <div style={{ fontFamily: fontFamilyCss('Montserrat'), fontSize: dfs, fontWeight: 600, color: colors.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{tagline}</div>
            )}
          </>
        ) : (
          <NameBoardTitle
            name={displayName}
            tagline={branding.tagline}
            showTagline={Boolean(showTagline)}
            color={colors.primary}
            muted={colors.textMuted}
            hfs={hfs}
            dfs={dfs}
          />
        )}
        {/* No rule under a logo — only under the text title. */}
        {!hasLogo && (
          <div style={{ width: Math.round(Math.min(widthPx, heightPx) * 0.18), height: 2, background: colors.primary, marginTop: 4 }} />
        )}
      </div>
    );
  }

  if (visual.headerGradient || visual.header === 'gradient-band' || visual.header === 'fast-bold') {
    return (
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
        minHeight: hasLogo ? Math.max(bandH, logoH + 24) : bandH,
        display: 'flex', flexDirection: isLandscape && !hasLogo ? 'row' : 'column',
        justifyContent: 'center', alignItems: 'center', gap: isLandscape ? 16 : 4,
        padding: `0 ${pad}px`, margin: `-${pad}px -${pad}px ${headerGap}px`,
      }}>
        {hasLogo ? (
          <Logo url={logoUrl} height={logoH} />
        ) : (
          <div style={{ textAlign: isLandscape ? 'left' : 'center' }}>
            <div style={{ fontFamily: titleFont, fontSize: hfs, fontWeight: headingWeight(customization), color: '#FFF', letterSpacing: '0.04em', ...titleExtras, textTransform: titleExtras.textTransform ?? textTransformCss(customization) }}>
              {displayName}
            </div>
          </div>
        )}
        {tagline && <div style={{ fontSize: dfs, color: 'rgba(255,255,255,0.85)' }}>{tagline}</div>}
      </div>
    );
  }

  const headerAlign = hasLogo || ultraWide || align === 'center' ? 'center' : 'left';
  return (
    <div style={{
      borderBottom: hasLogo ? 'none' : `3px solid ${colors.primary}`,
      paddingBottom: hasLogo ? 0 : Math.round(Math.min(widthPx, heightPx) * 0.01),
      marginBottom: headerGap, display: 'flex', alignItems: 'center',
      justifyContent: headerAlign === 'center' ? 'center' : 'flex-start', gap: 12,
      flexDirection: hasLogo || ultraWide ? 'column' : (isLandscape ? 'row' : 'column'),
      textAlign: headerAlign,
    }}>
      {hasLogo ? (
        <Logo url={logoUrl} height={logoH} />
      ) : (
        <div style={{ fontFamily: titleFont, fontSize: hfs, fontWeight: headingWeight(customization), color: colors.primary, ...titleExtras, textTransform: titleExtras.textTransform ?? textTransformCss(customization) }}>{displayName}</div>
      )}
      {tagline && <div style={{ fontSize: dfs, color: colors.textMuted }}>{tagline}</div>}
    </div>
  );
}

/** Footer contact only — wall-board QR lives in the last column (no "Scan to order"). */
function WallFooter({ style, customization, branding, widthPx, heightPx, pad }: {
  style: TemplateStyle; customization: DesignCustomization; branding: RestaurantBranding;
  widthPx: number; heightPx: number; pad: number;
}) {
  const fonts = effectiveFonts(customization);
  const { colors } = customization;
  const dfs = scaledDescFsWall(widthPx, heightPx, customization);
  const social = [branding.phone, branding.instagram].filter(Boolean).join(' · ');
  const visual = TEMPLATE_VISUALS[style];

  if (!social) return null;

  if (visual.footer === 'strip') {
    return (
      <div style={{
        flexShrink: 0, margin: `0 -${pad}px -${pad}px`,
        background: colors.primary, padding: `10px ${pad}px`,
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
      }}>
        <div style={{ fontSize: dfs, color: 'rgba(255,255,255,0.9)', fontFamily: fonts.body }}>{social}</div>
      </div>
    );
  }

  return (
    <div style={{ flexShrink: 0, marginTop: Math.round(heightPx * 0.01) }}>
      <div style={{
        borderTop: `2px solid ${colors.border}`,
        paddingTop: 10,
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: dfs, color: colors.textMuted, fontFamily: fonts.body }}>{social}</div>
      </div>
    </div>
  );
}

function PriceLeader({ style, color, fontSize }: {
  style: NonNullable<DesignCustomization['priceLeaderStyle']>;
  color: string;
  fontSize: number;
}) {
  if (style === 'none') return null;
  if (style === 'hyphens') {
    return (
      <span
        aria-hidden
        style={{
          flex: '1 1 0%', minWidth: 10, overflow: 'hidden', whiteSpace: 'nowrap',
          color, fontSize: Math.max(8, Math.round(fontSize * 0.85)), letterSpacing: '0.02em',
          lineHeight: 1, alignSelf: 'center', margin: '0 4px',
        }}
      >
        {'- '.repeat(48)}
      </span>
    );
  }
  const borderStyle = style === 'dots' ? 'dotted' : style === 'dashes' ? 'dashed' : 'solid';
  return (
    <span
      aria-hidden
      style={{
        flex: '1 1 0%', minWidth: 10, height: 0, alignSelf: 'center',
        margin: '0 6px', borderBottom: `1.5px ${borderStyle} ${color}`,
      }}
    />
  );
}

function WallColumn({
  column,
  customization,
  widthPx,
  heightPx,
  blockColor,
  bodyFs,
  catFs,
  qr,
}: {
  column: WallBoardColumn;
  customization: DesignCustomization;
  widthPx: number;
  heightPx: number;
  blockColor: string;
  bodyFs: number;
  catFs: number;
  /** Larger QR pinned to the bottom of the last column (no label). */
  qr?: { siteUrl: string; size: number; fgColor: string };
}) {
  const fonts = effectiveFonts(customization);
  const { showPrices, showColumnBorders, columnBorderColor, priceLeaderStyle = "none" } = customization;
  const bfs = bodyFs;
  const cfs = catFs;
  const itemGap = wallBoardItemGap(bfs);
  const text = contrastTextColor(blockColor);
  const ruleColor = hexToRgba(text === "#FFFFFF" ? "#FFFFFF" : "#000000", 0.28);
  const leaderColor = hexToRgba(text === "#FFFFFF" ? "#FFFFFF" : "#000000", 0.35);
  const pad = Math.round(Math.min(widthPx, heightPx) * 0.016);
  const colBorder = showColumnBorders
    ? `${Math.max(1, Math.round(Math.min(widthPx, heightPx) * 0.0025))}px solid ${columnBorderColor ?? DEFAULT_COLUMN_BORDER_COLOR}`
    : undefined;
  const useLeader = showPrices && priceLeaderStyle !== "none";
  const categoryBreakGap = wallBoardSegmentGap(cfs, bfs);

  return (
    <div
      style={{
        breakInside: "avoid",
        background: blockColor,
        color: text,
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        borderRadius: Math.max(4, Math.round(widthPx * 0.006)),
        padding: pad,
        border: colBorder,
      }}
    >
      <div
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
      >
      {column.segments
        .filter((segment) => segment.items.length > 0)
        .map((segment, segIndex) => (
        <div
          key={`${segment.categoryId}-${segment.continued ? "cont" : "start"}-${segment.items[0]?.id ?? "empty"}`}
          style={{
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            marginTop:
              segIndex > 0
                ? segment.continued
                  ? itemGap
                  : categoryBreakGap
                : 0,
          }}
        >
          {!segment.continued && (
            <div
              style={{
                fontFamily: fontFamilyCss(fonts.heading),
                fontSize: cfs,
                fontWeight: 700,
                color: text,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                lineHeight: 1.15,
                borderBottom: `2px solid ${ruleColor}`,
                paddingBottom: Math.round(cfs * 0.35),
                marginBottom: Math.round(cfs * 1.15),
                wordBreak: "break-word",
              }}
            >
              {segment.title}
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              gap: itemGap,
            }}
          >
            {segment.items.map((dish) => (
              <div
                key={dish.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: useLeader ? "center" : "flex-start",
                  gap: useLeader ? 0 : 6,
                  flexShrink: 0,
                  minWidth: 0,
                  width: "100%",
                  lineHeight: WALL_ITEM_LINE_HEIGHT,
                }}
              >
                <div
                  style={{
                    fontFamily: fontFamilyCss(fonts.body),
                    fontSize: bfs,
                    fontWeight: 600,
                    color: text,
                    lineHeight: WALL_ITEM_LINE_HEIGHT,
                    // Keep names on one line like the preview; leaders absorb leftover width.
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: useLeader ? "0 1 auto" : "1 1 auto",
                    minWidth: 0,
                  }}
                >
                  {wallBoardDisplayName(dish.name, segment.title)}
                </div>
                {showPrices && dish.price != null && (
                  <>
                    <PriceLeader style={priceLeaderStyle} color={leaderColor} fontSize={bfs} />
                    <div
                      style={{
                        fontFamily: fontFamilyCss(fonts.price),
                        fontSize: bfs,
                        fontWeight: 700,
                        color: text,
                        flex: "0 0 auto",
                        whiteSpace: "nowrap",
                        lineHeight: WALL_ITEM_LINE_HEIGHT,
                        marginLeft: useLeader ? 0 : undefined,
                      }}
                    >
                      ₹{dish.price}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      </div>
      {qr && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            justifyContent: "center",
            paddingTop: Math.round(itemGap * 1.2),
          }}
        >
          <QRCodeSVG
            value={qr.siteUrl}
            size={qr.size}
            fgColor={qr.fgColor}
            bgColor="transparent"
            level="H"
          />
        </div>
      )}
    </div>
  );
}

export function WallBoardMenu({ style, customization, branding, menuItems, fmt, widthPx, heightPx, siteUrl }: WallBoardMenuProps) {
  const visual = TEMPLATE_VISUALS[style];
  const pad = Math.round(Math.min(widthPx, heightPx) * 0.04);
  const topPad = customization.logoUrl ? Math.round(pad * 0.4) : pad;
  const border = outerBorderCss(visual, customization);
  const isLandscape = fmt.orientation === "landscape";
  const hasFooterSocial = Boolean(branding.phone || branding.instagram);
  const contentHeight =
    wallBoardContentHeight(
      heightPx,
      widthPx,
      pad,
      isLandscape,
      customization.showQR,
      hasFooterSocial,
      Boolean(customization.logoUrl),
    ) + (pad - topPad);

  // Size type for a ~13.8" column module, then pack into that many columns.
  const moduleColWidth = Math.round(13.8 * 96);
  const probeCols = Math.max(1, Math.round(widthPx / moduleColWidth));
  const baseBodyFs = scaledBodyFsWall(widthPx, heightPx, customization, probeCols);
  const baseCatFs = scaledCatFsWall(widthPx, heightPx, customization, probeCols);
  const totalItems = menuItems.reduce((n, c) => n + c.items.length, 0);
  const flowCols = wallBoardFlowColumnCount(totalItems, contentHeight, baseBodyFs, baseCatFs);
  const maxByWidth = Math.max(1, Math.floor((widthPx - pad * 2) / (moduleColWidth * 0.85)));
  // Honor Columns control when set (e.g. 58.2×23" → 4 cols); else use flow capacity.
  const userCols = customization.layout.columns;
  const cols = Math.min(
    maxByWidth,
    userCols >= 2 ? userCols : Math.max(1, flowCols),
  );
  // Reserve room in every column’s pack budget so the last-column QR is not clipped.
  const columnQrSize = wallBoardColumnQrSize(widthPx, heightPx, cols);
  const packHeight = customization.showQR
    ? Math.max(200, contentHeight - columnQrSize - Math.round(Math.min(widthPx, heightPx) * 0.02))
    : contentHeight;
  const { bodyFs, catFs, packed } = fitWallBoardType({
    categories: menuItems,
    columnCount: cols,
    contentHeightPx: packHeight,
    bodyFs: baseBodyFs,
    catFs: baseCatFs,
  });
  const gridCols = Math.max(1, packed.length);
  const palette = wallColumnPalette(customization.colors, customization.columnColors);
  const gridGap = Math.round(Math.min(widthPx, heightPx) * 0.014);
  const lastColIdx = gridCols - 1;

  return (
    <div
      style={{
        width: widthPx,
        height: heightPx,
        position: "relative",
        boxSizing: "border-box",
        overflow: "hidden",
        padding: `${topPad}px ${pad}px ${pad}px`,
        fontFamily: effectiveFonts(customization).body,
        border,
        borderRadius: containerRadius(customization),
        boxShadow: containerShadow(customization),
        background: baseBackground(customization),
        display: "flex",
        flexDirection: "column",
      }}
    >
      {customization.backgroundType === "pattern" && customization.backgroundPattern && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            ...patternOverlay(customization.backgroundPattern, patternInkColor(customization)),
            pointerEvents: "none",
          }}
        />
      )}
      <div style={{ flexShrink: 0 }}>
        <WallHeader
          style={style}
          customization={customization}
          branding={branding}
          widthPx={widthPx}
          heightPx={heightPx}
          isLandscape={isLandscape}
          pad={pad}
        />
      </div>
      <div
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          gridTemplateRows: "minmax(0, 1fr)",
          gap: gridGap,
          alignContent: "stretch",
          alignItems: "stretch",
          justifyItems: "stretch",
        }}
      >
        {packed.map((column, i) => (
          <WallColumn
            key={`wall-col-${i}`}
            column={column}
            customization={customization}
            widthPx={widthPx}
            heightPx={heightPx}
            blockColor={palette[i % palette.length]}
            bodyFs={bodyFs}
            catFs={catFs}
            qr={
              customization.showQR && i === lastColIdx
                ? {
                    siteUrl,
                    size: columnQrSize,
                    fgColor: contrastTextColor(palette[i % palette.length]),
                  }
                : undefined
            }
          />
        ))}
      </div>
      <WallFooter
        style={style}
        customization={customization}
        branding={branding}
        widthPx={widthPx}
        heightPx={heightPx}
        pad={pad}
      />
    </div>
  );
}
