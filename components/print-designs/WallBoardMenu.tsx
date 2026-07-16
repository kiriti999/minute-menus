/**
 * WallBoardMenu — orientation-aware layout for portrait, landscape, and square wall boards.
 */
import type { Category, DesignCustomization, RestaurantBranding, TemplateStyle } from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type { FormatInfo } from "../../lib/printDesigns";
import { wallBoardDisplayName } from "../../lib/wallBoardDishTitle";
import { TEMPLATE_VISUALS } from "../../lib/templateConfig";
import {
  baseBackground,
  containerRadius,
  containerShadow,
  contrastTextColor,
  effectiveFonts,
  formatPrintDisplayName,
  headingWeight,
  hexToRgba,
  logoAlign,
  resolveWallColumns,
  outerBorderCss,
  patternOverlay,
  scaledBodyFsWall,
  scaledCatFsWall,
  scaledDescFsWall,
  scaledHeadingFsWall,
  splitNameBoardTitle,
  textTransformCss,
  titleFontFamily,
  titleStyleExtras,
  wallBoardColumns,
  wallBoardContentHeight,
  wallBoardDensityScale,
  wallBoardQrSize,
  wallColumnPalette,
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
          <span style={{ fontFamily: 'Playfair Display', fontSize: Math.round(hfs * 0.78), fontWeight: 700, color, letterSpacing: '0.1em' }}>{parts.lead}</span>
          <span style={{ fontFamily: 'Playfair Display', fontSize: Math.round(hfs * 0.55), fontWeight: 700, color }}>&</span>
          <span style={{ fontFamily: 'Great Vibes', fontSize: Math.round(hfs * 1.05), fontWeight: 400, color }}>{parts.script}</span>
        </div>
      ) : (
        <div style={{ fontFamily: 'Playfair Display', fontSize: hfs, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{name}</div>
      )}
      {showTagline && tagline && (
        <div style={{ fontFamily: 'Montserrat', fontSize: dfs, fontWeight: 600, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: Math.round(dfs * 0.7) }}>{tagline}</div>
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
              <div style={{ fontFamily: 'Montserrat', fontSize: dfs, fontWeight: 600, color: colors.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{tagline}</div>
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

function WallFooter({ style, customization, branding, siteUrl, widthPx, heightPx, pad }: {
  style: TemplateStyle; customization: DesignCustomization; branding: RestaurantBranding;
  siteUrl: string; widthPx: number; heightPx: number; pad: number;
}) {
  const fonts = effectiveFonts(customization);
  const { colors, showQR } = customization;
  const dfs = scaledDescFsWall(widthPx, heightPx, customization);
  const qrSize = wallBoardQrSize(widthPx, heightPx);
  const social = [branding.phone, branding.instagram].filter(Boolean).join(' · ');
  const visual = TEMPLATE_VISUALS[style];

  if (!showQR && !social) return null;

  if (visual.footer === 'strip') {
    return (
      <div style={{
        flexShrink: 0, margin: `0 -${pad}px -${pad}px`,
        background: colors.primary, padding: `10px ${pad}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        {showQR && <QRCodeSVG value={siteUrl} size={qrSize} fgColor="#FFF" bgColor="transparent" level="H" />}
        {social && <div style={{ fontSize: dfs, color: 'rgba(255,255,255,0.9)', fontFamily: fonts.body }}>{social}</div>}
      </div>
    );
  }

  return (
    <div style={{ flexShrink: 0, marginTop: Math.round(heightPx * 0.01) }}>
      {showQR && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: social ? 10 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor="transparent" level="H" />
            <div style={{ fontSize: dfs, color: colors.textMuted, fontFamily: fonts.body }}>Scan to order</div>
          </div>
        </div>
      )}
      {social && (
        <div style={{
          borderTop: showQR ? `2px solid ${colors.border}` : 'none',
          paddingTop: showQR ? 10 : 0,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: dfs, color: colors.textMuted, fontFamily: fonts.body }}>{social}</div>
        </div>
      )}
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
          flex: '1 1 auto', minWidth: 8, overflow: 'hidden', whiteSpace: 'nowrap',
          color, fontSize: Math.max(8, Math.round(fontSize * 0.85)), letterSpacing: '0.02em',
          lineHeight: 1, alignSelf: 'flex-end', margin: '0 4px 2px',
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
        flex: '1 1 auto', minWidth: 8, height: 0, alignSelf: 'flex-end',
        margin: '0 6px 4px', borderBottom: `1.5px ${borderStyle} ${color}`,
      }}
    />
  );
}

function WallCategory({ cat, customization, widthPx, heightPx, blockColor, cols, densityScale }: {
  cat: Category; customization: DesignCustomization; widthPx: number; heightPx: number; blockColor: string; cols: number; densityScale: number;
}) {
  const fonts = effectiveFonts(customization);
  const { showPrices, showColumnBorders, columnBorderColor, colors, priceLeaderStyle = 'none' } = customization;
  const bfs = Math.max(12, Math.round(scaledBodyFsWall(widthPx, heightPx, customization, cols) * densityScale));
  const cfs = Math.max(14, Math.round(scaledCatFsWall(widthPx, heightPx, customization, cols) * densityScale));
  const itemGap = Math.max(3, Math.round(bfs * (densityScale < 0.88 ? 0.22 : 0.3)));
  const lineHeight = densityScale < 0.88 ? 1.08 : 1.12;
  const text = contrastTextColor(blockColor);
  const ruleColor = hexToRgba(text === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.28);
  const leaderColor = hexToRgba(text === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.35);
  const pad = Math.round(Math.min(widthPx, heightPx) * 0.016);
  const colBorder = showColumnBorders
    ? `${Math.max(1, Math.round(Math.min(widthPx, heightPx) * 0.0025))}px solid ${columnBorderColor ?? colors.border}`
    : undefined;
  const useLeader = showPrices && priceLeaderStyle !== 'none';

  return (
    <div style={{
      breakInside: 'avoid', background: blockColor, color: text, boxSizing: 'border-box',
      width: '100%', height: '100%', minWidth: 0, minHeight: 0,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      borderRadius: Math.max(4, Math.round(widthPx * 0.006)), padding: pad,
      border: colBorder,
    }}>
      <div style={{
        fontFamily: fonts.heading, fontSize: cfs, fontWeight: 700, color: text,
        textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.15,
        borderBottom: `2px solid ${ruleColor}`, paddingBottom: Math.round(cfs * 0.35),
        marginBottom: Math.round(cfs * 0.5), wordBreak: 'break-word',
      }}>
        {cat.title}
      </div>
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-evenly', gap: itemGap, overflow: 'hidden',
      }}>
        {cat.items.map((dish) => (
          <div
            key={dish.id}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: useLeader ? 'flex-end' : 'flex-start',
              gap: useLeader ? 0 : 6, flexShrink: 0, minWidth: 0,
            }}
          >
            <div style={{
              fontFamily: fonts.body, fontSize: bfs, fontWeight: 600, color: text,
              lineHeight, wordBreak: 'break-word', hyphens: 'auto',
              flex: useLeader ? '0 1 auto' : 1, minWidth: 0, maxWidth: useLeader ? '62%' : undefined,
            }}>
              {wallBoardDisplayName(dish.name, cat.title)}
            </div>
            {showPrices && dish.price != null && (
              <>
                <PriceLeader style={priceLeaderStyle} color={leaderColor} fontSize={bfs} />
                <div style={{
                  fontFamily: fonts.price, fontSize: bfs, fontWeight: 700, color: text,
                  flexShrink: 0, whiteSpace: 'nowrap', lineHeight: 1.25,
                }}>
                  ₹{dish.price}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WallBoardMenu({ style, customization, branding, menuItems, fmt, widthPx, heightPx, siteUrl }: WallBoardMenuProps) {
  const visual = TEMPLATE_VISUALS[style];
  const pad = Math.round(Math.min(widthPx, heightPx) * 0.04);
  const topPad = customization.logoUrl ? Math.round(pad * 0.4) : pad;
  const border = outerBorderCss(visual, customization);
  const maxCols = wallBoardColumns(widthPx, heightPx, customization.layout.columns);
  const cols = resolveWallColumns(menuItems.length, maxCols);
  const palette = wallColumnPalette(customization.colors, customization.columnColors);
  const isLandscape = fmt.orientation === 'landscape';
  const hasFooterSocial = Boolean(branding.phone || branding.instagram);
  const contentHeight = wallBoardContentHeight(
    heightPx, widthPx, pad, isLandscape, customization.showQR, hasFooterSocial, Boolean(customization.logoUrl),
  ) + (pad - topPad);
  const maxItems = Math.max(1, ...menuItems.map((c) => c.items.length));
  const maxTitleChars = Math.max(
    1,
    ...menuItems.flatMap((c) => c.items.map((d) => wallBoardDisplayName(d.name, c.title).length)),
  );
  const baseBodyFs = scaledBodyFsWall(widthPx, heightPx, customization, cols);
  const gridRows = Math.max(1, Math.ceil(menuItems.length / cols));
  const gridGap = Math.round(Math.min(widthPx, heightPx) * 0.014);
  const colWidth = (widthPx - pad * 2 - gridGap * (cols - 1)) / cols;
  const densityScale = wallBoardDensityScale(
    maxItems,
    contentHeight / gridRows,
    baseBodyFs,
    maxTitleChars,
    colWidth,
  );

  return (
    <div style={{
      width: widthPx, height: heightPx, position: 'relative', boxSizing: 'border-box', overflow: 'hidden',
      padding: `${topPad}px ${pad}px ${pad}px`, fontFamily: effectiveFonts(customization).body, border,
      borderRadius: containerRadius(customization), boxShadow: containerShadow(customization),
      background: baseBackground(customization), display: 'flex', flexDirection: 'column',
    }}>
      {customization.backgroundType === 'pattern' && customization.backgroundPattern && (
        <div style={{ position: 'absolute', inset: 0, ...patternOverlay(customization.backgroundPattern, customization.colors.border), pointerEvents: 'none' }} />
      )}
      <div style={{ flexShrink: 0 }}>
        <WallHeader style={style} customization={customization} branding={branding} widthPx={widthPx} heightPx={heightPx} isLandscape={isLandscape} pad={pad} />
      </div>
      <div style={{
        flex: '1 1 0%', minHeight: 0, overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
        gap: gridGap,
        alignContent: 'stretch',
        alignItems: 'stretch',
        justifyItems: 'stretch',
      }}>
        {menuItems.map((cat, i) => (
          <WallCategory
            key={cat.id}
            cat={cat}
            customization={customization}
            widthPx={widthPx}
            heightPx={heightPx}
            blockColor={palette[i % palette.length]}
            cols={cols}
            densityScale={densityScale}
          />
        ))}
      </div>
      <WallFooter style={style} customization={customization} branding={branding} siteUrl={siteUrl} widthPx={widthPx} heightPx={heightPx} pad={pad} />
    </div>
  );
}
