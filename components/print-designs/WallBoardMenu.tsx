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
  return <img src={url} alt="Logo" style={{ height, width: 'auto', objectFit: 'contain', display: 'block' }} />;
}

function NameBoardTitle({ name, tagline, showTagline, color, muted, hfs, dfs }: {
  name: string; tagline?: string; showTagline: boolean; color: string; muted: string; hfs: number; dfs: number;
}) {
  const parts = splitNameBoardTitle(name);
  if (!parts) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Playfair Display', fontSize: hfs, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{name}</div>
        {showTagline && tagline && (
          <div style={{ fontFamily: 'Montserrat', fontSize: dfs, fontWeight: 600, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: Math.round(dfs * 0.6) }}>{tagline}</div>
        )}
      </div>
    );
  }
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Playfair Display', fontSize: Math.round(hfs * 0.72), fontWeight: 700, color, letterSpacing: '0.12em', lineHeight: 1 }}>{parts.lead}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: Math.round(hfs * 0.12), marginTop: Math.round(hfs * -0.05) }}>
        <span style={{ fontFamily: 'Playfair Display', fontSize: Math.round(hfs * 0.45), fontWeight: 700, color }}>&</span>
        <span style={{ fontFamily: 'Great Vibes', fontSize: Math.round(hfs * 1.05), fontWeight: 400, color, lineHeight: 1.05 }}>{parts.script}</span>
      </div>
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
  const hfs = scaledHeadingFsWall(widthPx, heightPx, customization);
  const dfs = scaledDescFsWall(widthPx, heightPx, customization);
  const align = logoAlign(logoPosition);
  const bandH = isLandscape ? Math.round(heightPx * 0.14) : Math.round(heightPx * 0.12);
  const headerGap = Math.round(Math.min(widthPx, heightPx) * 0.015);
  const displayName = formatPrintDisplayName(branding.name, customization.typography.textTransform);
  const titleFont = titleFontFamily(customization);
  const titleExtras = titleStyleExtras(customization);

  if (visual.header === 'name-board') {
    return (
      <div style={{
        marginBottom: headerGap, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
        minHeight: Math.round(bandH * 0.9),
      }}>
        {logoUrl && <Logo url={logoUrl} height={Math.round(hfs * 0.9)} />}
        <NameBoardTitle
          name={displayName}
          tagline={branding.tagline}
          showTagline={Boolean(showTagline)}
          color={colors.primary}
          muted={colors.textMuted}
          hfs={hfs}
          dfs={dfs}
        />
        <div style={{ width: Math.round(Math.min(widthPx, heightPx) * 0.18), height: 2, background: colors.primary, marginTop: 4 }} />
      </div>
    );
  }

  if (visual.headerGradient || visual.header === 'gradient-band' || visual.header === 'fast-bold') {
    return (
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
        minHeight: bandH, display: 'flex', flexDirection: isLandscape ? 'row' : 'column',
        justifyContent: 'center', alignItems: 'center', gap: isLandscape ? 16 : 4,
        padding: `0 ${pad}px`, margin: `-${pad}px -${pad}px ${headerGap}px`,
      }}>
        {logoUrl && <Logo url={logoUrl} height={Math.round(bandH * 0.45)} />}
        <div style={{ textAlign: isLandscape ? 'left' : 'center' }}>
          <div style={{ fontFamily: titleFont, fontSize: hfs, fontWeight: headingWeight(customization), color: '#FFF', letterSpacing: '0.04em', ...titleExtras, textTransform: titleExtras.textTransform ?? textTransformCss(customization) }}>
            {displayName}
          </div>
          {showTagline && branding.tagline && <div style={{ fontSize: dfs, color: 'rgba(255,255,255,0.85)' }}>{branding.tagline}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderBottom: `3px solid ${colors.primary}`, paddingBottom: Math.round(Math.min(widthPx, heightPx) * 0.01),
      marginBottom: headerGap, display: 'flex', alignItems: 'center',
      justifyContent: align === 'center' ? 'center' : 'flex-start', gap: 12,
      flexDirection: isLandscape ? 'row' : 'column', textAlign: align === 'center' ? 'center' : 'left',
    }}>
      {logoUrl && <Logo url={logoUrl} height={Math.round(hfs * 1.2)} />}
      <div>
        <div style={{ fontFamily: titleFont, fontSize: hfs, fontWeight: headingWeight(customization), color: colors.primary, ...titleExtras, textTransform: titleExtras.textTransform ?? textTransformCss(customization) }}>{displayName}</div>
        {showTagline && branding.tagline && <div style={{ fontSize: dfs, color: colors.textMuted }}>{branding.tagline}</div>}
      </div>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor="transparent" level="H" />
            <div style={{ fontSize: dfs, color: colors.textMuted, fontFamily: fonts.body }}>Scan to order</div>
          </div>
        </div>
      )}
      <div style={{
        borderTop: `2px solid ${colors.border}`,
        paddingTop: 10,
        display: 'flex',
        justifyContent: social ? 'flex-start' : 'flex-end',
        alignItems: 'center',
      }}>
        {social && (
          <div style={{ fontSize: dfs, color: colors.textMuted, fontFamily: fonts.body }}>{social}</div>
        )}
      </div>
    </div>
  );
}

function WallCategory({ cat, customization, widthPx, heightPx, blockColor, cols, densityScale }: {
  cat: Category; customization: DesignCustomization; widthPx: number; heightPx: number; blockColor: string; cols: number; densityScale: number;
}) {
  const fonts = effectiveFonts(customization);
  const { showPrices } = customization;
  const bfs = Math.max(7, Math.round(scaledBodyFsWall(widthPx, heightPx, customization, cols) * densityScale));
  const cfs = Math.max(8, Math.round(scaledCatFsWall(widthPx, heightPx, customization, cols) * densityScale));
  const itemGap = Math.max(2, Math.round(bfs * (densityScale < 0.88 ? 0.28 : 0.36)));
  const lineHeight = densityScale < 0.88 ? 1.1 : 1.15;
  const text = contrastTextColor(blockColor);
  const ruleColor = hexToRgba(text === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.28);
  const pad = Math.round(Math.min(widthPx, heightPx) * 0.016);

  return (
    <div style={{
      breakInside: 'avoid', background: blockColor, color: text, boxSizing: 'border-box',
      width: '100%', height: '100%', minWidth: 0, minHeight: 0,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      borderRadius: Math.max(4, Math.round(widthPx * 0.006)), padding: pad,
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
          <div key={dish.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, flexShrink: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: fonts.body, fontSize: bfs, fontWeight: 600, color: text,
                lineHeight, wordBreak: 'break-word', hyphens: 'auto',
              }}>
                {wallBoardDisplayName(dish.name, cat.title)}
              </div>
            </div>
            {showPrices && dish.price != null && (
              <div style={{
                fontFamily: fonts.price, fontSize: bfs, fontWeight: 700, color: text,
                flexShrink: 0, whiteSpace: 'nowrap', lineHeight: 1.25,
              }}>
                ₹{dish.price}
              </div>
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
  const border = outerBorderCss(visual, customization);
  const maxCols = wallBoardColumns(widthPx, heightPx, customization.layout.columns);
  const cols = resolveWallColumns(menuItems.length, maxCols);
  const palette = wallColumnPalette(customization.colors, customization.columnColors);
  const isLandscape = fmt.orientation === 'landscape';
  const hasFooterSocial = Boolean(branding.phone || branding.instagram);
  const contentHeight = wallBoardContentHeight(heightPx, widthPx, pad, isLandscape, customization.showQR, hasFooterSocial);
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
      padding: pad, fontFamily: effectiveFonts(customization).body, border,
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
