/**
 * MenuTemplate — config-driven renderer for all template styles.
 */
import type {
  Category,
  DesignCustomization,
  JobFlyerContent,
  PrintDesignType,
  PrintFormat,
  RestaurantBranding,
  TemplateStyle,
} from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";
import { FORMATS } from "../../lib/printDesigns";
import { TEMPLATE_VISUALS } from "../../lib/templateConfig";
import { PrintBackgroundLayers } from "./PrintBackgroundLayers";
import {
  baseBackground,
  categoryHeadingStyle,
  containerRadius,
  containerShadow,
  effectiveFonts,
  footerQrSize,
  formatPrintDisplayName,
  headingWeight,
  logoAlign,
  menuColumnWidth,
  menuFooterContactLine,
  MENU_QR_LABEL,
  menuQrLabelFs,
  outerBorderCss,
  priceColor,
  scaledBodyFs,
  scaledCatFs,
  scaledDescFs,
  scaledHeadingFs,
  scaledPriceFs,
  splitNameBoardTitle,
  textTransformCss,
  titleFontFamily,
  titleStyleExtras,
} from "./menuStyleHelpers";
import CompactMenuLayout from "./CompactMenuLayout";
import { JobFlyerLayout } from "./JobFlyerLayout";
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
  jobFlyer?: JobFlyerContent;
}

function Logo({ url, height }: { url?: string; height: number }) {
  if (!url) return null;
  return <img src={url} alt="Logo" style={{ height, width: 'auto', objectFit: 'contain', display: 'block' }} />;
}

function BackgroundLayers({ customization }: { customization: DesignCustomization }) {
  return (
    <>
      <PrintBackgroundLayers customization={customization} />
      <div style={{ position: 'absolute', inset: 0, background: baseBackground(customization), zIndex: -1 }} />
    </>
  );
}

function DishList({ cat, style, customization, widthPx, pageColumns }: { cat: Category; style: TemplateStyle; customization: DesignCustomization; widthPx: number; pageColumns: number }) {
  const fonts = effectiveFonts(customization);
  const visual = TEMPLATE_VISUALS[style];
  const { colors, layout, showPrices, showDescriptions } = customization;
  const colWidth = menuColumnWidth(widthPx, pageColumns);
  const bfs = scaledBodyFs(colWidth, customization);
  const pfs = scaledPriceFs(widthPx, bfs);
  const dfs = scaledDescFs(colWidth, customization);
  const cfs = scaledCatFs(colWidth, customization);
  const gap = layout.spacing === 'compact' ? Math.round(colWidth * 0.008) : Math.round(colWidth * 0.016);
  const dishCols = pageColumns > 1 ? 1 : (layout.columns === 2 ? 2 : 1);
  const priceInk = priceColor(colors);

  return (
    <div style={{ marginBottom: Math.round(colWidth * 0.04), breakInside: 'avoid', minWidth: 0, width: '100%' }}>
      <div style={categoryHeadingStyle(visual.category, customization, cfs, fonts)}>{cat.title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: dishCols > 1 ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap }}>
        {cat.items.map((dish) => (
          <div key={dish.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, minWidth: 0, width: '100%' }}>
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
              <div style={{ fontFamily: fonts.price, fontSize: pfs, fontWeight: 700, color: priceInk, flexShrink: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
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
  const hasLogo = Boolean(logoUrl);
  const hfs = scaledHeadingFs(widthPx, customization);
  const dfs = scaledDescFs(widthPx, customization);
  const hw = headingWeight(customization);
  const ttf = textTransformCss(customization);
  const pad = Math.round(widthPx * 0.05);
  const align = logoAlign(logoPosition);
  const displayName = formatPrintDisplayName(branding.name, customization.typography.textTransform);
  const titleFont = titleFontFamily(customization);
  const titleExtras = titleStyleExtras(customization);
  const titleTransform = titleExtras.textTransform ?? ttf;
  const tagline = showTagline && branding.tagline ? branding.tagline : null;
  const logoH = Math.round(widthPx * (hasLogo ? 0.09 : 0.07));

  if (visual.header === 'name-board') {
    const parts = splitNameBoardTitle(displayName);
    return (
      <div style={{ textAlign: 'center', marginBottom: Math.round(widthPx * 0.02) }}>
        {hasLogo ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Logo url={logoUrl} height={logoH} /></div>
        ) : parts ? (
          <div style={{
            display: 'flex', flexWrap: 'nowrap', alignItems: 'baseline', justifyContent: 'center',
            gap: Math.round(hfs * 0.14), whiteSpace: 'nowrap', lineHeight: 1,
          }}>
            <span style={{ fontFamily: 'Playfair Display', fontSize: Math.round(hfs * 0.78), fontWeight: 700, color: colors.primary, letterSpacing: '0.1em' }}>{parts.lead}</span>
            <span style={{ fontFamily: 'Playfair Display', fontSize: Math.round(hfs * 0.55), fontWeight: 700, color: colors.primary }}>&</span>
            <span style={{ fontFamily: 'Great Vibes', fontSize: Math.round(hfs * 1.05), color: colors.primary }}>{parts.script}</span>
          </div>
        ) : (
          <div style={{ fontFamily: 'Playfair Display', fontSize: hfs, fontWeight: 700, color: colors.primary, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{displayName}</div>
        )}
        {tagline && (
          <div style={{ fontFamily: 'Montserrat', fontSize: dfs, fontWeight: 600, color: colors.textMuted, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 8 }}>{tagline}</div>
        )}
        <div style={{ width: 48, height: 2, background: colors.primary, margin: '10px auto 0' }} />
      </div>
    );
  }

  if (visual.header === 'gradient-band' || visual.header === 'fast-bold' || (visual.headerGradient && visual.header === 'street-playful')) {
    const bandH = Math.round(heightPx * 0.17);
    return (
      <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, height: bandH, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: align, padding: `0 ${pad}px`, margin: `-${pad}px -${pad}px ${Math.round(widthPx * 0.02)}px`, gap: 4 }}>
        {hasLogo ? (
          <Logo url={logoUrl} height={Math.round(bandH * 0.45)} />
        ) : (
          <div style={{ fontFamily: titleFont, fontSize: hfs, fontWeight: hw, color: '#FFF', textTransform: titleTransform, letterSpacing: '0.04em', ...titleExtras }}>{displayName}</div>
        )}
        {tagline && <div style={{ fontSize: dfs, color: 'rgba(255,255,255,0.85)' }}>{tagline}</div>}
      </div>
    );
  }

  if (visual.header === 'center-ornate' || visual.header === 'luxury-center' || visual.header === 'ethnic-pattern') {
    return (
      <div style={{ textAlign: 'center', marginBottom: Math.round(widthPx * 0.02) }}>
        {hasLogo ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Logo url={logoUrl} height={logoH} /></div>
        ) : (
          <>
            {visual.showOrnaments && <div style={{ fontSize: Math.round(widthPx * 0.014), color: colors.accent, letterSpacing: '0.3em', marginBottom: 6 }}>✦ ✦ ✦</div>}
            <div style={{ fontFamily: titleFont, fontSize: hfs, fontWeight: hw, color: colors.primary, letterSpacing: '0.06em', textTransform: titleTransform, ...titleExtras }}>{displayName}</div>
          </>
        )}
        {tagline && <div style={{ fontFamily: fonts.body, fontSize: dfs, color: colors.textMuted, fontStyle: 'italic', marginTop: 3 }}>{tagline}</div>}
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${colors.accent}, transparent)`, marginTop: 10 }} />
      </div>
    );
  }

  if (visual.header === 'rustic-box') {
    return (
      <div style={{ border: `2px dashed ${colors.secondary}`, borderRadius: 4, padding: Math.round(widthPx * 0.02), marginBottom: Math.round(widthPx * 0.02), textAlign: align === 'center' ? 'center' : 'left' }}>
        {hasLogo ? (
          <Logo url={logoUrl} height={Math.round(widthPx * 0.08)} />
        ) : (
          <div style={{ fontFamily: titleFont, fontSize: hfs, fontWeight: 700, color: colors.primary, textTransform: titleTransform, ...titleExtras }}>{displayName}</div>
        )}
        {tagline && <div style={{ fontSize: dfs, color: colors.textMuted }}>{tagline}</div>}
      </div>
    );
  }

  if (visual.header === 'cafe-warm') {
    return (
      <div style={{ textAlign: 'center', marginBottom: Math.round(widthPx * 0.02) }}>
        {hasLogo ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Logo url={logoUrl} height={logoH} /></div>
        ) : (
          <div style={{ fontFamily: titleFont, fontSize: Math.round(hfs * 1.1), fontWeight: 400, color: colors.primary, ...titleExtras }}>{displayName}</div>
        )}
        {tagline && <div style={{ fontFamily: fonts.body, fontSize: dfs, color: colors.textMuted, fontStyle: 'italic' }}>{tagline}</div>}
      </div>
    );
  }

  if (visual.header === 'fine-sparse') {
    return (
      <div style={{ marginBottom: Math.round(widthPx * 0.03), textAlign: 'center' }}>
        {hasLogo ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}><Logo url={logoUrl} height={logoH} /></div>
        ) : (
          <div style={{ fontFamily: titleFont, fontSize: hfs, fontWeight: 300, color: colors.primary, letterSpacing: '0.2em', textTransform: titleTransform, ...titleExtras }}>{displayName}</div>
        )}
        {tagline && <div style={{ fontSize: dfs, color: colors.textMuted, marginTop: 4, letterSpacing: '0.1em' }}>{tagline}</div>}
        <div style={{ width: 40, height: 1, background: colors.border, margin: '10px auto 0' }} />
      </div>
    );
  }

  // left-rule, street-playful (non-gradient), default
  return (
    <div style={{
      borderBottom: `2px solid ${colors.primary}`, paddingBottom: Math.round(widthPx * 0.012),
      marginBottom: Math.round(widthPx * 0.02), display: 'flex', alignItems: 'center',
      justifyContent: logoPosition === 'center' || hasLogo ? 'center' : 'flex-start',
      gap: Math.round(widthPx * 0.015),
      flexDirection: logoPosition === 'center' || hasLogo ? 'column' : 'row',
    }}>
      {hasLogo ? (
        <Logo url={logoUrl} height={logoH} />
      ) : (
        <div style={{ textAlign: logoPosition === 'center' ? 'center' : 'left' }}>
          <div style={{ fontFamily: titleFont, fontSize: hfs, fontWeight: hw, color: colors.primary, textTransform: titleTransform, letterSpacing: '0.04em', ...titleExtras }}>{displayName}</div>
          {tagline && <div style={{ fontFamily: fonts.body, fontSize: dfs, color: colors.textMuted, marginTop: 2 }}>{tagline}</div>}
        </div>
      )}
      {hasLogo && tagline && (
        <div style={{ fontFamily: fonts.body, fontSize: dfs, color: colors.textMuted, textAlign: 'center' }}>{tagline}</div>
      )}
    </div>
  );
}

function MenuQrBlock({
  siteUrl,
  qrSize,
  widthPx,
  customization,
  colors,
  fonts,
  fgColor,
  bgColor = "transparent",
  labelColor,
}: {
  siteUrl: string;
  qrSize: number;
  widthPx: number;
  customization: DesignCustomization;
  colors: DesignCustomization["colors"];
  fonts: ReturnType<typeof effectiveFonts>;
  fgColor: string;
  bgColor?: string;
  labelColor: string;
}) {
  const labelFs = menuQrLabelFs(widthPx, customization);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div
        style={{
          fontSize: labelFs,
          fontWeight: 700,
          color: labelColor,
          fontFamily: fonts.body,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          textAlign: "center",
          lineHeight: 1.15,
        }}
      >
        {MENU_QR_LABEL}
      </div>
      <QRCodeSVG value={siteUrl} size={qrSize} fgColor={fgColor} bgColor={bgColor} level="H" />
    </div>
  );
}

function MenuFooter({ style, customization, branding, siteUrl, widthPx, pad }: { style: TemplateStyle; customization: DesignCustomization; branding: RestaurantBranding; siteUrl: string; widthPx: number; pad: number }) {
  const visual = TEMPLATE_VISUALS[style];
  const fonts = effectiveFonts(customization);
  const { colors, showQR } = customization;
  const dfs = scaledDescFs(widthPx, customization);
  const qrSize = footerQrSize(widthPx);
  const social = menuFooterContactLine(branding);

  if (visual.footer === 'strip') {
    return (
      <div style={{
        flexShrink: 0, margin: `0 -${pad}px -${pad}px`,
        background: colors.primary, padding: `8px ${pad}px`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        {showQR && (
          <MenuQrBlock
            siteUrl={siteUrl}
            qrSize={qrSize}
            widthPx={widthPx}
            customization={customization}
            colors={colors}
            fonts={fonts}
            fgColor="#FFF"
            labelColor="#FFF"
          />
        )}
        {social && <div style={{ fontSize: dfs, color: 'rgba(255,255,255,0.9)', fontFamily: fonts.body }}>{social}</div>}
      </div>
    );
  }

  if (visual.footer === 'center') {
    return (
      <div style={{ flexShrink: 0, textAlign: 'center', marginTop: Math.round(widthPx * 0.015) }}>
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${colors.accent}, transparent)`, marginBottom: 8 }} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          {showQR && (
            <MenuQrBlock
              siteUrl={siteUrl}
              qrSize={qrSize}
              widthPx={widthPx}
              customization={customization}
              colors={colors}
              fonts={fonts}
              fgColor={colors.primary}
              labelColor={colors.primary}
            />
          )}
          {social && <div style={{ fontSize: dfs, color: colors.textMuted, fontFamily: fonts.body }}>{social}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flexShrink: 0, marginTop: Math.round(widthPx * 0.015) }}>
      {showQR && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: social ? 8 : 0 }}>
          <MenuQrBlock
            siteUrl={siteUrl}
            qrSize={qrSize}
            widthPx={widthPx}
            customization={customization}
            colors={colors}
            fonts={fonts}
            fgColor={colors.primary}
            labelColor={colors.primary}
          />
        </div>
      )}
      {social && (
        <div style={{
          borderTop: `1px solid ${colors.border}`,
          paddingTop: 8,
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

function PocketCard({ customization, branding, menuItems, widthPx, heightPx, siteUrl }: Omit<MenuTemplateProps, 'style' | 'designType'>) {
  const { colors } = customization;
  const isLandscape = widthPx > heightPx;

  return (
    <CompactMenuLayout
      customization={customization}
      branding={branding}
      menuItems={menuItems}
      widthPx={widthPx}
      heightPx={heightPx}
      siteUrl={siteUrl}
      border={`2px solid ${colors.primary}`}
      layout={isLandscape ? 'landscape' : 'portrait'}
      qrAlign="bottom-right"
    />
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
        display: 'flex', flexDirection: 'column',
      }}
    >
      <BackgroundLayers customization={customization} />
      <div style={{ flexShrink: 0 }}>
        <MenuHeader style={style} customization={customization} branding={branding} widthPx={widthPx} heightPx={heightPx} />
      </div>
      <div style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: Math.round(widthPx * 0.025), alignContent: 'start',
      }}>
        {menuItems.map((cat) => (
          <DishList key={cat.id} cat={cat} style={style} customization={customization} widthPx={widthPx} pageColumns={cols} />
        ))}
      </div>
      <MenuFooter style={style} customization={customization} branding={branding} siteUrl={siteUrl} widthPx={widthPx} pad={pad} />
    </div>
  );
}

const MenuTemplate: React.FC<MenuTemplateProps> = (props) => {
  if (props.designType === 'job-flyer' && props.jobFlyer) {
    return (
      <JobFlyerLayout
        style={props.style}
        customization={props.customization}
        branding={props.branding}
        jobFlyer={props.jobFlyer}
        widthPx={props.widthPx}
        heightPx={props.heightPx}
        siteUrl={props.siteUrl}
      />
    );
  }
  if (props.designType === 'sticker') {
    return (
      <StickerLayout
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
