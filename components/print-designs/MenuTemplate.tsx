/**
 * MenuTemplate — config-driven renderer for all 10 template styles.
 */
import type {
  Category,
  DesignCustomization,
  PrintDesignType,
  PrintFormat,
  RestaurantBranding,
  TemplateStyle,
} from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";
import { FORMATS } from "../../lib/printDesigns";
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
  scaledBodyFs,
  scaledCatFs,
  scaledDescFs,
  scaledHeadingFs,
  textTransformCss,
} from "./menuStyleHelpers";
import StickerLayout from "./StickerLayout";
import { WallBoardMenu } from "./WallBoardMenu";

export interface MenuTemplateProps {
  style: TemplateStyle;
  designType: PrintDesignType;
  format: PrintFormat;
  customization: DesignCustomization;
  branding: RestaurantBranding;
  menuItems: Category[];
  widthPx: number;
  heightPx: number;
  siteUrl: string;
}

function Logo({ url, height }: { url?: string; height: number }) {
  if (!url) return null;
  return <img src={url} alt="Logo" style={{ height, width: 'auto', objectFit: 'contain', display: 'block' }} />;
}

function BackgroundLayers({ customization, widthPx, heightPx }: { customization: DesignCustomization; widthPx: number; heightPx: number }) {
  const showPattern = customization.backgroundType === 'pattern' && customization.backgroundPattern;
  const showImage = customization.backgroundType === 'image' && customization.backgroundImageUrl;
  return (
    <>
      {showPattern && (
        <div style={{ position: 'absolute', inset: 0, ...patternOverlay(customization.backgroundPattern!, customization.colors.border), pointerEvents: 'none' }} />
      )}
      {showImage && (
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${customization.backgroundImageUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.18, pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: baseBackground(customization), zIndex: -1 }} />
    </>
  );
}

function DishList({ cat, style, customization, widthPx }: { cat: Category; style: TemplateStyle; customization: DesignCustomization; widthPx: number }) {
  const fonts = effectiveFonts(customization);
  const visual = TEMPLATE_VISUALS[style];
  const { colors, layout, showPrices, showDescriptions } = customization;
  const bfs = scaledBodyFs(widthPx, customization);
  const dfs = scaledDescFs(widthPx, customization);
  const cfs = scaledCatFs(widthPx, customization);
  const gap = layout.spacing === 'compact' ? Math.round(widthPx * 0.004) : Math.round(widthPx * 0.008);

  return (
    <div style={{ marginBottom: Math.round(widthPx * 0.02) }}>
      <div style={categoryHeadingStyle(visual.category, customization, cfs, fonts)}>{cat.title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: layout.columns === 2 ? '1fr 1fr' : '1fr', gap }}>
        {cat.items.map((dish) => (
          <div key={dish.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fonts.body, fontSize: bfs, fontWeight: 500, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {dish.name}
              </div>
              {showDescriptions && dish.description && (
                <div style={{ fontFamily: fonts.body, fontSize: dfs, color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dish.description}
                </div>
              )}
            </div>
            {showPrices && dish.price != null && (
              <div style={{ fontFamily: fonts.price, fontSize: bfs, fontWeight: 600, color: colors.accent, flexShrink: 0 }}>
                ₹{dish.price}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuHeader({ style, customization, branding, widthPx, heightPx }: Pick<MenuTemplateProps, 'style' | 'customization' | 'branding' | 'widthPx' | 'heightPx'>) {
  const visual = TEMPLATE_VISUALS[style];
  const fonts = effectiveFonts(customization);
  const { colors, showTagline, logoUrl, logoPosition } = customization;
  const hfs = scaledHeadingFs(widthPx, customization);
  const dfs = scaledDescFs(widthPx, customization);
  const hw = headingWeight(customization);
  const ttf = textTransformCss(customization);
  const pad = Math.round(widthPx * 0.05);
  const align = logoAlign(logoPosition);

  if (visual.header === 'gradient-band' || visual.header === 'fast-bold' || (visual.headerGradient && visual.header === 'street-playful')) {
    const bandH = Math.round(heightPx * 0.17);
    return (
      <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, height: bandH, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: align, padding: `0 ${pad}px`, margin: `-${pad}px -${pad}px ${Math.round(widthPx * 0.02)}px`, gap: 4 }}>
        {logoUrl && <Logo url={logoUrl} height={Math.round(bandH * 0.3)} />}
        <div style={{ fontFamily: fonts.heading, fontSize: hfs, fontWeight: hw, color: '#FFF', textTransform: ttf, letterSpacing: '0.04em' }}>{branding.name}</div>
        {showTagline && branding.tagline && <div style={{ fontSize: dfs, color: 'rgba(255,255,255,0.85)' }}>{branding.tagline}</div>}
      </div>
    );
  }

  if (visual.header === 'center-ornate' || visual.header === 'luxury-center' || visual.header === 'ethnic-pattern') {
    return (
      <div style={{ textAlign: 'center', marginBottom: Math.round(widthPx * 0.02) }}>
        {logoUrl && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Logo url={logoUrl} height={Math.round(widthPx * 0.07)} /></div>}
        {visual.showOrnaments && <div style={{ fontSize: Math.round(widthPx * 0.014), color: colors.accent, letterSpacing: '0.3em', marginBottom: 6 }}>✦ ✦ ✦</div>}
        <div style={{ fontFamily: fonts.heading, fontSize: hfs, fontWeight: hw, color: colors.primary, letterSpacing: '0.06em', textTransform: ttf }}>{branding.name}</div>
        {showTagline && branding.tagline && <div style={{ fontFamily: fonts.body, fontSize: dfs, color: colors.textMuted, fontStyle: 'italic', marginTop: 3 }}>{branding.tagline}</div>}
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${colors.accent}, transparent)`, marginTop: 10 }} />
      </div>
    );
  }

  if (visual.header === 'rustic-box') {
    return (
      <div style={{ border: `2px dashed ${colors.secondary}`, borderRadius: 4, padding: Math.round(widthPx * 0.02), marginBottom: Math.round(widthPx * 0.02), textAlign: align === 'center' ? 'center' : 'left' }}>
        {logoUrl && <Logo url={logoUrl} height={Math.round(widthPx * 0.06)} />}
        <div style={{ fontFamily: fonts.heading, fontSize: hfs, fontWeight: 700, color: colors.primary, textTransform: 'uppercase' }}>{branding.name}</div>
        {showTagline && branding.tagline && <div style={{ fontSize: dfs, color: colors.textMuted }}>{branding.tagline}</div>}
      </div>
    );
  }

  if (visual.header === 'cafe-warm') {
    return (
      <div style={{ textAlign: 'center', marginBottom: Math.round(widthPx * 0.02) }}>
        {logoUrl && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Logo url={logoUrl} height={Math.round(widthPx * 0.06)} /></div>}
        <div style={{ fontFamily: fonts.heading, fontSize: Math.round(hfs * 1.1), fontWeight: 400, color: colors.primary }}>{branding.name}</div>
        {showTagline && branding.tagline && <div style={{ fontFamily: fonts.body, fontSize: dfs, color: colors.textMuted, fontStyle: 'italic' }}>{branding.tagline}</div>}
      </div>
    );
  }

  if (visual.header === 'fine-sparse') {
    return (
      <div style={{ marginBottom: Math.round(widthPx * 0.03), textAlign: 'center' }}>
        <div style={{ fontFamily: fonts.heading, fontSize: hfs, fontWeight: 300, color: colors.primary, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{branding.name}</div>
        {showTagline && branding.tagline && <div style={{ fontSize: dfs, color: colors.textMuted, marginTop: 4, letterSpacing: '0.1em' }}>{branding.tagline}</div>}
        <div style={{ width: 40, height: 1, background: colors.border, margin: '10px auto 0' }} />
      </div>
    );
  }

  // left-rule, street-playful (non-gradient), default
  return (
    <div style={{ borderBottom: `2px solid ${colors.primary}`, paddingBottom: Math.round(widthPx * 0.012), marginBottom: Math.round(widthPx * 0.02), display: 'flex', alignItems: 'center', justifyContent: logoPosition === 'center' ? 'center' : 'flex-start', gap: Math.round(widthPx * 0.015), flexDirection: logoPosition === 'center' ? 'column' : 'row' }}>
      {logoUrl && <Logo url={logoUrl} height={Math.round(widthPx * 0.07)} />}
      <div style={{ textAlign: logoPosition === 'center' ? 'center' : 'left' }}>
        <div style={{ fontFamily: fonts.heading, fontSize: hfs, fontWeight: hw, color: colors.primary, textTransform: ttf, letterSpacing: '0.04em' }}>{branding.name}</div>
        {showTagline && branding.tagline && <div style={{ fontFamily: fonts.body, fontSize: dfs, color: colors.textMuted, marginTop: 2 }}>{branding.tagline}</div>}
      </div>
    </div>
  );
}

function MenuFooter({ style, customization, branding, siteUrl, widthPx, pad }: { style: TemplateStyle; customization: DesignCustomization; branding: RestaurantBranding; siteUrl: string; widthPx: number; pad: number }) {
  const visual = TEMPLATE_VISUALS[style];
  const fonts = effectiveFonts(customization);
  const { colors, showQR } = customization;
  const dfs = scaledDescFs(widthPx, customization);
  const qrSize = Math.round(widthPx * 0.06);
  const social = [branding.phone, branding.instagram, branding.website].filter(Boolean).join(' · ');

  if (visual.footer === 'strip') {
    return (
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: colors.primary, padding: `8px ${pad}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {showQR && <QRCodeSVG value={siteUrl} size={qrSize} fgColor="#FFF" bgColor="transparent" />}
        {social && <div style={{ fontSize: dfs, color: 'rgba(255,255,255,0.9)', fontFamily: fonts.body }}>{social}</div>}
      </div>
    );
  }

  if (visual.footer === 'center') {
    return (
      <div style={{ position: 'absolute', bottom: pad, left: pad, right: pad, textAlign: 'center' }}>
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${colors.accent}, transparent)`, marginBottom: 8 }} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          {showQR && <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor="transparent" />}
          {social && <div style={{ fontSize: dfs, color: colors.textMuted, fontFamily: fonts.body }}>{social}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', bottom: pad, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `1px solid ${colors.border}`, paddingTop: 8 }}>
      {showQR && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor="transparent" />
          <div style={{ fontSize: dfs, color: colors.textMuted, fontFamily: fonts.body }}>Scan menu</div>
        </div>
      )}
      {social && <div style={{ fontSize: dfs, color: colors.textMuted, fontFamily: fonts.body, textAlign: 'right' }}>{social}</div>}
    </div>
  );
}

function PocketCard({ customization, branding, widthPx, heightPx, siteUrl }: Omit<MenuTemplateProps, 'style' | 'designType' | 'menuItems'>) {
  const fonts = effectiveFonts(customization);
  const { colors, showQR, showTagline, logoUrl } = customization;
  const qrSize = Math.round(Math.min(widthPx, heightPx) * 0.38);
  const pad = Math.round(widthPx * 0.06);
  const hfs = scaledHeadingFs(widthPx, customization);

  return (
    <div style={{ width: widthPx, height: heightPx, position: 'relative', background: baseBackground(customization), boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: widthPx > heightPx ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: Math.round(widthPx * 0.04), padding: pad, fontFamily: fonts.body, borderRadius: containerRadius(customization), boxShadow: containerShadow(customization) }}>
      <BackgroundLayers customization={customization} widthPx={widthPx} heightPx={heightPx} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
        {logoUrl && <Logo url={logoUrl} height={Math.round(heightPx * 0.2)} />}
        <div style={{ fontFamily: fonts.heading, fontSize: hfs, fontWeight: 700, color: colors.primary }}>{branding.name || 'Restaurant'}</div>
        {showTagline && branding.tagline && <div style={{ fontSize: scaledDescFs(widthPx, customization), color: colors.textMuted }}>{branding.tagline}</div>}
        {branding.phone && <div style={{ fontSize: scaledDescFs(widthPx, customization), color: colors.textMuted }}>{branding.phone}</div>}
      </div>
      {showQR && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
          <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor="transparent" />
          <div style={{ fontSize: Math.max(6, Math.round(widthPx * 0.022)), color: colors.textMuted }}>Scan to view menu</div>
        </div>
      )}
    </div>
  );
}

function StandardMenu({ style, customization, branding, menuItems, widthPx, heightPx, siteUrl }: Omit<MenuTemplateProps, 'designType'>) {
  const visual = TEMPLATE_VISUALS[style];
  const fonts = effectiveFonts(customization);
  const pad = Math.round(widthPx * 0.06);
  const border = outerBorderCss(visual, customization);
  const cols = customization.layout.columns === 2 && widthPx > 500 ? 2 : 1;

  return (
    <div
      style={{
        width: widthPx, height: heightPx, position: 'relative', boxSizing: 'border-box', overflow: 'hidden',
        padding: pad, fontFamily: fonts.body, border, borderRadius: containerRadius(customization),
        boxShadow: containerShadow(customization), background: baseBackground(customization),
      }}
    >
      <BackgroundLayers customization={customization} widthPx={widthPx} heightPx={heightPx} />
      <MenuHeader style={style} customization={customization} branding={branding} widthPx={widthPx} heightPx={heightPx} />
      <div style={{ columnCount: cols, columnGap: Math.round(widthPx * 0.025), position: 'relative' }}>
        {menuItems.map((cat) => (
          <DishList key={cat.id} cat={cat} style={style} customization={customization} widthPx={widthPx} />
        ))}
      </div>
      <MenuFooter style={style} customization={customization} branding={branding} siteUrl={siteUrl} widthPx={widthPx} pad={pad} />
    </div>
  );
}

const MenuTemplate: React.FC<MenuTemplateProps> = (props) => {
  if (props.designType === 'sticker') {
    return (
      <StickerLayout
        customization={props.customization}
        branding={props.branding}
        fmt={FORMATS[props.format]}
        widthPx={props.widthPx}
        heightPx={props.heightPx}
        siteUrl={props.siteUrl}
      />
    );
  }
  if (props.designType === 'pocket-card') {
    return <PocketCard {...props} />;
  }
  if (props.designType === 'wall-board') {
    return (
      <WallBoardMenu
        style={props.style}
        customization={props.customization}
        branding={props.branding}
        menuItems={props.menuItems}
        fmt={FORMATS[props.format]}
        widthPx={props.widthPx}
        heightPx={props.heightPx}
        siteUrl={props.siteUrl}
      />
    );
  }
  return <StandardMenu {...props} />;
};

export default MenuTemplate;
