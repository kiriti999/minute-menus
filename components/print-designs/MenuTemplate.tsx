/**
 * MenuTemplate — renders the actual printable design inside a fixed-size div.
 * Three styles: modern-minimal, classic-elegant, bold-colorful.
 * Pocket card / sticker types get their own compact layout regardless of style.
 * Used both for live preview (scaled down) and for html2canvas PDF export.
 */
import type {
  Category,
  DesignCustomization,
  PrintDesignType,
  RestaurantBranding,
  TemplateStyle,
} from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";

export interface MenuTemplateProps {
  style: TemplateStyle;
  designType: PrintDesignType;
  customization: DesignCustomization;
  branding: RestaurantBranding;
  menuItems: Category[];
  widthPx: number;
  heightPx: number;
  siteUrl: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Body font size that scales proportionally so wall boards stay readable. */
const bodyFs = (w: number) => Math.max(9, Math.round(w * 0.014));
/** Description font is 80% of body size. */
const descFs = (w: number) => Math.max(8, Math.round(w * 0.011));
/** Category heading is 130% of body size. */
const catFs = (w: number) => Math.max(10, Math.round(w * 0.018));

function bgStyle(custom: DesignCustomization): string {
  if (custom.backgroundType === 'gradient' && custom.backgroundGradient) {
    return custom.backgroundGradient;
  }
  return custom.colors.background;
}

// ─── Logo row ─────────────────────────────────────────────────────────────────

function Logo({ url, height }: { url?: string; height: number }) {
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Logo"
      style={{ height, width: 'auto', objectFit: 'contain', display: 'block' }}
    />
  );
}

// ─── Pocket / Sticker layout (QR-focused) ────────────────────────────────────

function PocketCard({ custom, branding, widthPx, heightPx, siteUrl }: Omit<MenuTemplateProps, 'style' | 'designType' | 'menuItems'>) {
  const { colors, fonts, showQR, showTagline, logoUrl } = custom;
  const isLandscape = widthPx > heightPx;
  const qrSize = Math.round(Math.min(widthPx, heightPx) * 0.38);
  const pad = Math.round(widthPx * 0.06);
  const nameFontSize = Math.round(widthPx * 0.055);

  return (
    <div
      style={{
        width: widthPx, height: heightPx,
        background: bgStyle(custom),
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: isLandscape ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Math.round(widthPx * 0.04),
        padding: pad,
        fontFamily: fonts.body,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isLandscape ? 'flex-start' : 'center', gap: 4 }}>
        {logoUrl && <Logo url={logoUrl} height={Math.round(heightPx * 0.2)} />}
        <div style={{ fontFamily: fonts.heading, fontSize: nameFontSize, fontWeight: 700, color: colors.primary, lineHeight: 1.1 }}>
          {branding.name || 'Restaurant'}
        </div>
        {showTagline && branding.tagline && (
          <div style={{ fontSize: descFs(widthPx), color: colors.textMuted, fontStyle: 'italic' }}>
            {branding.tagline}
          </div>
        )}
        {branding.phone && (
          <div style={{ fontSize: descFs(widthPx), color: colors.textMuted, marginTop: 2 }}>{branding.phone}</div>
        )}
      </div>
      {showQR && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor="transparent" />
          <div style={{ fontSize: Math.max(6, Math.round(widthPx * 0.022)), color: colors.textMuted }}>Scan to view menu</div>
        </div>
      )}
    </div>
  );
}

// ─── Shared dish list ─────────────────────────────────────────────────────────

function DishList({ cat, custom, style, widthPx }: { cat: Category; custom: DesignCustomization; style: TemplateStyle; widthPx: number }) {
  const { colors, fonts, layout, showPrices, showDescriptions } = custom;
  const isCompact = layout.spacing === 'compact';
  const gap = isCompact ? Math.round(widthPx * 0.004) : Math.round(widthPx * 0.008);
  const bfs = bodyFs(widthPx);
  const dfs = descFs(widthPx);
  const cfs = catFs(widthPx);

  return (
    <div style={{ marginBottom: isCompact ? Math.round(widthPx * 0.012) : Math.round(widthPx * 0.022) }}>
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: cfs,
          fontWeight: 700,
          color: style === 'bold-colorful' ? colors.background : colors.primary,
          backgroundColor: style === 'bold-colorful' ? colors.primary : 'transparent',
          borderBottom: style === 'modern-minimal' ? `1px solid ${colors.border}` : 'none',
          borderLeft: style === 'classic-elegant' ? `3px solid ${colors.accent}` : 'none',
          padding: style === 'bold-colorful' ? `${Math.round(cfs * 0.3)}px ${Math.round(cfs * 0.75)}px` : style === 'classic-elegant' ? `2px 0 2px 8px` : '2px 0',
          marginBottom: Math.round(cfs * 0.5),
          letterSpacing: style === 'modern-minimal' ? '0.12em' : '0.04em',
          textTransform: style === 'modern-minimal' ? 'uppercase' : 'none',
        }}
      >
        {cat.title}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: layout.columns === 2 ? '1fr 1fr' : '1fr', gap }}>
        {cat.items.map((dish) => (
          <div key={dish.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: Math.round(bfs * 0.5) }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fonts.body, fontSize: bfs, fontWeight: style === 'bold-colorful' ? 600 : 500, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {dish.name}
              </div>
              {showDescriptions && dish.description && (
                <div style={{ fontFamily: fonts.body, fontSize: dfs, color: colors.textMuted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {dish.description}
                </div>
              )}
            </div>
            {showPrices && dish.price != null && (
              <div style={{ fontFamily: fonts.price, fontSize: bfs, fontWeight: 600, color: style === 'bold-colorful' ? colors.accent : colors.primary, whiteSpace: 'nowrap', flexShrink: 0 }}>
                ₹{dish.price}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modern Minimal ───────────────────────────────────────────────────────────

function ModernMinimal({ custom, branding, menuItems, widthPx, heightPx, siteUrl }: Omit<MenuTemplateProps, 'style' | 'designType'>) {
  const { colors, fonts, showQR, showTagline, logoUrl } = custom;
  const pad = Math.round(widthPx * 0.06);
  const qrSize = Math.round(widthPx * 0.065);

  return (
    <div style={{ width: widthPx, height: heightPx, background: bgStyle(custom), padding: pad, fontFamily: fonts.body, boxSizing: 'border-box', overflow: 'hidden', position: 'relative' }}>
      <div style={{ borderBottom: `2px solid ${colors.primary}`, paddingBottom: Math.round(widthPx * 0.015), marginBottom: Math.round(widthPx * 0.025), display: 'flex', alignItems: 'center', gap: Math.round(widthPx * 0.015) }}>
        {logoUrl && <Logo url={logoUrl} height={Math.round(widthPx * 0.07)} />}
        <div>
          <div style={{ fontFamily: fonts.heading, fontSize: Math.round(widthPx * 0.055), fontWeight: 300, color: colors.primary, letterSpacing: '0.04em' }}>
            {branding.name}
          </div>
          {showTagline && branding.tagline && (
            <div style={{ fontFamily: fonts.body, fontSize: descFs(widthPx), color: colors.textMuted, marginTop: 2, letterSpacing: '0.08em' }}>
              {branding.tagline}
            </div>
          )}
        </div>
      </div>

      <div style={{ columnCount: custom.layout.columns === 2 && widthPx > 500 ? 2 : 1, columnGap: Math.round(widthPx * 0.03) }}>
        {menuItems.map((cat) => (
          <DishList key={cat.id} cat={cat} custom={custom} style="modern-minimal" widthPx={widthPx} />
        ))}
      </div>

      <div style={{ position: 'absolute', bottom: pad, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `1px solid ${colors.border}`, paddingTop: Math.round(widthPx * 0.008) }}>
        {showQR && (
          <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(widthPx * 0.01) }}>
            <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor="transparent" />
            <div style={{ fontSize: descFs(widthPx), color: colors.textMuted, fontFamily: fonts.body }}>Scan to view<br />full menu</div>
          </div>
        )}
        {branding.phone && (
          <div style={{ fontSize: descFs(widthPx), color: colors.textMuted, fontFamily: fonts.body, textAlign: 'right' }}>{branding.phone}</div>
        )}
      </div>
    </div>
  );
}

// ─── Classic Elegant ──────────────────────────────────────────────────────────

function ClassicElegant({ custom, branding, menuItems, widthPx, heightPx, siteUrl }: Omit<MenuTemplateProps, 'style' | 'designType'>) {
  const { colors, fonts, showQR, showTagline, logoUrl } = custom;
  const pad = Math.round(widthPx * 0.07);
  const qrSize = Math.round(widthPx * 0.055);
  const ornamentFs = Math.round(widthPx * 0.015);

  return (
    <div style={{ width: widthPx, height: heightPx, background: bgStyle(custom), padding: pad, boxSizing: 'border-box', overflow: 'hidden', position: 'relative', border: `6px double ${colors.accent}` }}>
      <div style={{ textAlign: 'center', marginBottom: Math.round(widthPx * 0.02) }}>
        {logoUrl && <Logo url={logoUrl} height={Math.round(widthPx * 0.07)} />}
        <div style={{ fontSize: ornamentFs, color: colors.accent, letterSpacing: '0.3em', marginBottom: Math.round(widthPx * 0.008) }}>✦ ✦ ✦</div>
        <div style={{ fontFamily: fonts.heading, fontSize: Math.round(widthPx * 0.06), fontWeight: 700, color: colors.primary, letterSpacing: '0.06em' }}>
          {branding.name}
        </div>
        {showTagline && branding.tagline && (
          <div style={{ fontFamily: fonts.body, fontSize: descFs(widthPx), color: colors.textMuted, marginTop: 3, fontStyle: 'italic', letterSpacing: '0.06em' }}>
            {branding.tagline}
          </div>
        )}
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${colors.accent}, transparent)`, marginTop: Math.round(widthPx * 0.012) }} />
      </div>

      <div style={{ columnCount: custom.layout.columns === 2 && widthPx > 500 ? 2 : 1, columnGap: Math.round(widthPx * 0.025) }}>
        {menuItems.map((cat) => (
          <DishList key={cat.id} cat={cat} custom={custom} style="classic-elegant" widthPx={widthPx} />
        ))}
      </div>

      <div style={{ position: 'absolute', bottom: pad, left: pad, right: pad, textAlign: 'center' }}>
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${colors.accent}, transparent)`, marginBottom: Math.round(widthPx * 0.01) }} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: Math.round(widthPx * 0.02) }}>
          {showQR && <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor="transparent" />}
          {branding.phone && (
            <div style={{ fontSize: descFs(widthPx), color: colors.textMuted, fontFamily: fonts.body, fontStyle: 'italic' }}>{branding.phone}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bold Colorful ────────────────────────────────────────────────────────────

function BoldColorful({ custom, branding, menuItems, widthPx, heightPx, siteUrl }: Omit<MenuTemplateProps, 'style' | 'designType'>) {
  const { colors, fonts, showQR, showTagline, logoUrl } = custom;
  const pad = Math.round(widthPx * 0.05);
  const headerH = Math.round(heightPx * 0.18);
  const qrSize = Math.round(widthPx * 0.05);

  return (
    <div style={{ width: widthPx, height: heightPx, background: bgStyle(custom), boxSizing: 'border-box', overflow: 'hidden', position: 'relative', fontFamily: fonts.body }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          height: headerH,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: `0 ${pad}px`, gap: Math.round(widthPx * 0.005),
        }}
      >
        {logoUrl && <Logo url={logoUrl} height={Math.round(headerH * 0.35)} />}
        <div style={{ fontFamily: fonts.heading, fontSize: Math.round(widthPx * 0.065), fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {branding.name}
        </div>
        {showTagline && branding.tagline && (
          <div style={{ fontSize: descFs(widthPx), color: 'rgba(255,255,255,0.85)' }}>{branding.tagline}</div>
        )}
      </div>

      <div style={{ padding: pad, columnCount: custom.layout.columns === 2 && widthPx > 500 ? 2 : 1, columnGap: Math.round(widthPx * 0.02) }}>
        {menuItems.map((cat) => (
          <DishList key={cat.id} cat={cat} custom={custom} style="bold-colorful" widthPx={widthPx} />
        ))}
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: colors.primary, padding: `${Math.round(widthPx * 0.01)}px ${pad}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {showQR && (
          <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(widthPx * 0.01) }}>
            <QRCodeSVG value={siteUrl} size={qrSize} fgColor="#FFFFFF" bgColor="transparent" />
            <div style={{ fontSize: descFs(widthPx), color: 'rgba(255,255,255,0.8)', fontFamily: fonts.body }}>Scan to order</div>
          </div>
        )}
        {branding.phone && (
          <div style={{ fontSize: descFs(widthPx), color: 'rgba(255,255,255,0.9)', fontFamily: fonts.body }}>{branding.phone}</div>
        )}
      </div>
    </div>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

const MenuTemplate: React.FC<MenuTemplateProps> = (props) => {
  if (props.designType === 'pocket-card' || props.designType === 'sticker') {
    return <PocketCard {...props} />;
  }
  const rest = { ...props } as Omit<MenuTemplateProps, 'style' | 'designType'>;
  if (props.style === 'classic-elegant') return <ClassicElegant {...rest} />;
  if (props.style === 'bold-colorful') return <BoldColorful {...rest} />;
  return <ModernMinimal {...rest} />;
};

export default MenuTemplate;
