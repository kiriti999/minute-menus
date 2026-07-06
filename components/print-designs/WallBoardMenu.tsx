/**
 * WallBoardMenu — orientation-aware layout for portrait, landscape, and square wall boards.
 */
import type { Category, DesignCustomization, RestaurantBranding, TemplateStyle } from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type { FormatInfo } from "../../lib/printDesigns";
import { TEMPLATE_VISUALS } from "../../lib/templateConfig";
import {
  baseBackground,
  categoryHeadingStyle,
  containerRadius,
  containerShadow,
  effectiveFonts,
  headingWeight,
  logoAlign,
  outerBorderCss,
  patternOverlay,
  scaledBodyFsWall,
  scaledCatFsWall,
  scaledDescFsWall,
  scaledHeadingFsWall,
  textTransformCss,
  wallBoardColumns,
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
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: colors.primary, padding: `10px ${pad}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {showQR && <QRCodeSVG value={siteUrl} size={qrSize} fgColor="#FFF" bgColor="transparent" level="H" />}
        {social && <div style={{ fontSize: dfs, color: 'rgba(255,255,255,0.9)', fontFamily: fonts.body }}>{social}</div>}
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', bottom: pad, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `2px solid ${colors.border}`, paddingTop: 10 }}>
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

function WallCategory({ cat, style, customization, widthPx, heightPx }: { cat: Category; style: TemplateStyle; customization: DesignCustomization; widthPx: number; heightPx: number }) {
  const fonts = effectiveFonts(customization);
  const visual = TEMPLATE_VISUALS[style];
  const { colors, showPrices, showDescriptions } = customization;
  const bfs = scaledBodyFsWall(widthPx, heightPx, customization);
  const dfs = scaledDescFsWall(widthPx, heightPx, customization);
  const cfs = scaledCatFsWall(widthPx, heightPx, customization);

  return (
    <div>
      <div style={categoryHeadingStyle(visual.category, customization, cfs, fonts)}>{cat.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(bfs * 0.4) }}>
        {cat.items.map((dish) => (
          <div key={dish.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fonts.body, fontSize: bfs, fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dish.name}</div>
              {showDescriptions && dish.description && (
                <div style={{ fontFamily: fonts.body, fontSize: dfs, color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dish.description}</div>
              )}
            </div>
            {showPrices && dish.price != null && (
              <div style={{ fontFamily: fonts.price, fontSize: bfs, fontWeight: 700, color: colors.accent, flexShrink: 0 }}>₹{dish.price}</div>
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
  const isLandscape = fmt.orientation === 'landscape';

  return (
    <div style={{
      width: widthPx, height: heightPx, position: 'relative', boxSizing: 'border-box', overflow: 'hidden',
      padding: pad, fontFamily: effectiveFonts(customization).body, border,
      borderRadius: containerRadius(customization), boxShadow: containerShadow(customization),
      background: baseBackground(customization),
    }}>
      {customization.backgroundType === 'pattern' && customization.backgroundPattern && (
        <div style={{ position: 'absolute', inset: 0, ...patternOverlay(customization.backgroundPattern, customization.colors.border), pointerEvents: 'none' }} />
      )}
      <WallHeader style={style} customization={customization} branding={branding} widthPx={widthPx} heightPx={heightPx} isLandscape={isLandscape} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: Math.round(widthPx * 0.02), position: 'relative', paddingBottom: Math.round(heightPx * 0.12) }}>
        {menuItems.map((cat) => (
          <WallCategory key={cat.id} cat={cat} style={style} customization={customization} widthPx={widthPx} heightPx={heightPx} />
        ))}
      </div>
      <WallFooter style={style} customization={customization} branding={branding} siteUrl={siteUrl} widthPx={widthPx} heightPx={heightPx} pad={pad} />
    </div>
  );
}
