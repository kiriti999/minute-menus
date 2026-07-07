/**
 * WallBoardMenu — orientation-aware layout for portrait, landscape, and square wall boards.
 */
import type { Category, DesignCustomization, RestaurantBranding, TemplateStyle } from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type { FormatInfo } from "../../lib/printDesigns";
import { TEMPLATE_VISUALS } from "../../lib/templateConfig";
import {
  baseBackground,
  containerRadius,
  containerShadow,
  contrastTextColor,
  effectiveFonts,
  headingWeight,
  hexToRgba,
  logoAlign,
  outerBorderCss,
  patternOverlay,
  scaledBodyFsWall,
  scaledCatFsWall,
  scaledDescFsWall,
  scaledHeadingFsWall,
  textTransformCss,
  wallBoardColumns,
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

function WallHeader({ style, customization, branding, widthPx, heightPx, isLandscape }: {
  style: TemplateStyle; customization: DesignCustomization; branding: RestaurantBranding;
  widthPx: number; heightPx: number; isLandscape: boolean;
}) {
  const visual = TEMPLATE_VISUALS[style];
  const fonts = effectiveFonts(customization);
  const { colors, showTagline, logoUrl, logoPosition } = customization;
  const hfs = scaledHeadingFsWall(widthPx, heightPx, customization);
  const dfs = scaledDescFsWall(widthPx, heightPx, customization);
  const pad = Math.round(widthPx * 0.04);
  const align = logoAlign(logoPosition);
  const bandH = isLandscape ? Math.round(heightPx * 0.14) : Math.round(heightPx * 0.12);

  if (visual.headerGradient || visual.header === 'gradient-band' || visual.header === 'fast-bold') {
    return (
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
        minHeight: bandH, display: 'flex', flexDirection: isLandscape ? 'row' : 'column',
        justifyContent: 'center', alignItems: 'center', gap: isLandscape ? 16 : 4,
        padding: `0 ${pad}px`, margin: `-${pad}px -${pad}px ${Math.round(widthPx * 0.015)}px`,
      }}>
        {logoUrl && <Logo url={logoUrl} height={Math.round(bandH * 0.45)} />}
        <div style={{ textAlign: isLandscape ? 'left' : 'center' }}>
          <div style={{ fontFamily: fonts.heading, fontSize: hfs, fontWeight: headingWeight(customization), color: '#FFF', letterSpacing: '0.04em', textTransform: textTransformCss(customization) }}>
            {branding.name}
          </div>
          {showTagline && branding.tagline && <div style={{ fontSize: dfs, color: 'rgba(255,255,255,0.85)' }}>{branding.tagline}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderBottom: `3px solid ${colors.primary}`, paddingBottom: Math.round(widthPx * 0.01),
      marginBottom: Math.round(widthPx * 0.015), display: 'flex', alignItems: 'center',
      justifyContent: align === 'center' ? 'center' : 'flex-start', gap: 12,
      flexDirection: isLandscape ? 'row' : 'column', textAlign: align === 'center' ? 'center' : 'left',
    }}>
      {logoUrl && <Logo url={logoUrl} height={Math.round(hfs * 1.2)} />}
      <div>
        <div style={{ fontFamily: fonts.heading, fontSize: hfs, fontWeight: headingWeight(customization), color: colors.primary, textTransform: textTransformCss(customization) }}>{branding.name}</div>
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
  const qrSize = Math.round(Math.min(widthPx, heightPx) * 0.09);
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
    <div style={{
      flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderTop: `2px solid ${colors.border}`, paddingTop: 10, marginTop: Math.round(heightPx * 0.01),
    }}>
      {showQR && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor="transparent" level="H" />
          <div style={{ fontSize: dfs, color: colors.textMuted, fontFamily: fonts.body }}>Scan to order</div>
        </div>
      )}
      {social && <div style={{ fontSize: dfs, color: colors.textMuted, fontFamily: fonts.body }}>{social}</div>}
    </div>
  );
}

function WallCategory({ cat, customization, widthPx, heightPx, blockColor }: {
  cat: Category; customization: DesignCustomization; widthPx: number; heightPx: number; blockColor: string;
}) {
  const fonts = effectiveFonts(customization);
  const { showPrices, showDescriptions } = customization;
  const bfs = scaledBodyFsWall(widthPx, heightPx, customization);
  const dfs = scaledDescFsWall(widthPx, heightPx, customization);
  const cfs = scaledCatFsWall(widthPx, heightPx, customization);
  const text = contrastTextColor(blockColor);
  const mutedText = hexToRgba(text === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.64);
  const ruleColor = hexToRgba(text === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.28);
  const pad = Math.round(widthPx * 0.016);

  return (
    <div style={{
      breakInside: 'avoid', background: blockColor, color: text, boxSizing: 'border-box',
      height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      borderRadius: Math.max(4, Math.round(widthPx * 0.006)), padding: pad,
    }}>
      <div style={{
        fontFamily: fonts.heading, fontSize: cfs, fontWeight: 700, color: text,
        textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.15,
        borderBottom: `2px solid ${ruleColor}`, paddingBottom: Math.round(cfs * 0.35),
        marginBottom: Math.round(cfs * 0.5),
      }}>
        {cat.title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(bfs * 0.4), overflow: 'hidden' }}>
        {cat.items.map((dish) => (
          <div key={dish.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fonts.body, fontSize: bfs, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dish.name}</div>
              {showDescriptions && dish.description && (
                <div style={{ fontFamily: fonts.body, fontSize: dfs, color: mutedText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dish.description}</div>
              )}
            </div>
            {showPrices && dish.price != null && (
              <div style={{ fontFamily: fonts.price, fontSize: bfs, fontWeight: 700, color: text, flexShrink: 0 }}>₹{dish.price}</div>
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
  const cols = wallBoardColumns(widthPx, heightPx, customization.layout.columns);
  const palette = wallColumnPalette(customization.colors, customization.columnColors);
  const isLandscape = fmt.orientation === 'landscape';

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
        <WallHeader style={style} customization={customization} branding={branding} widthPx={widthPx} heightPx={heightPx} isLandscape={isLandscape} />
      </div>
      <div style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: 'minmax(0, 1fr)',
        gap: Math.round(widthPx * 0.018), alignContent: 'start',
      }}>
        {menuItems.map((cat, i) => (
          <WallCategory
            key={cat.id}
            cat={cat}
            customization={customization}
            widthPx={widthPx}
            heightPx={heightPx}
            blockColor={palette[i % palette.length]}
          />
        ))}
      </div>
      <WallFooter style={style} customization={customization} branding={branding} siteUrl={siteUrl} widthPx={widthPx} heightPx={heightPx} pad={pad} />
    </div>
  );
}
