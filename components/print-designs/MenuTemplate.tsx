/**
 * MenuTemplate — renders the actual printable design inside a fixed-size div.
 * Three styles: modern-minimal, classic-elegant, bold-colorful.
 * Used both for live preview (scaled down) and for html2canvas PDF export.
 */
import type { Category, DesignCustomization, RestaurantBranding, TemplateStyle } from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";

interface MenuTemplateProps {
  style: TemplateStyle;
  customization: DesignCustomization;
  branding: RestaurantBranding;
  menuItems: Category[];
  /** Physical pixel size the template should render at (before scaling). */
  widthPx: number;
  heightPx: number;
  siteUrl: string;
}

// ─── Shared item list renderer ────────────────────────────────────────────────

function DishList({ cat, custom, style }: { cat: Category; custom: DesignCustomization; style: TemplateStyle }) {
  const { colors, fonts, layout, showPrices, showDescriptions } = custom;
  const isCompact = layout.spacing === 'compact';
  const gap = isCompact ? 6 : layout.spacing === 'spacious' ? 16 : 10;

  return (
    <div style={{ marginBottom: isCompact ? 12 : 20 }}>
      {/* Category heading */}
      <div
        style={{
          fontFamily: fonts.heading,
          fontSize: style === 'bold-colorful' ? 15 : 13,
          fontWeight: 700,
          color: style === 'bold-colorful' ? colors.background : colors.primary,
          backgroundColor: style === 'bold-colorful' ? colors.primary : 'transparent',
          borderBottom: style === 'modern-minimal' ? `1px solid ${colors.border}` : 'none',
          borderLeft: style === 'classic-elegant' ? `3px solid ${colors.accent}` : 'none',
          padding: style === 'bold-colorful' ? '4px 10px' : style === 'classic-elegant' ? '2px 0 2px 8px' : '2px 0',
          marginBottom: 8,
          letterSpacing: style === 'modern-minimal' ? '0.12em' : '0.04em',
          textTransform: style === 'modern-minimal' ? 'uppercase' : 'none',
        }}
      >
        {cat.title}
      </div>

      {/* Dish rows */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: layout.columns === 2 ? '1fr 1fr' : '1fr',
          gap,
        }}
      >
        {cat.items.map((dish) => (
          <div key={dish.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: style === 'bold-colorful' ? 12 : 11,
                  fontWeight: style === 'bold-colorful' ? 600 : 500,
                  color: colors.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {dish.name}
              </div>
              {showDescriptions && dish.description && (
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 9,
                    color: colors.textMuted,
                    marginTop: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {dish.description}
                </div>
              )}
            </div>
            {showPrices && dish.price != null && (
              <div
                style={{
                  fontFamily: fonts.price,
                  fontSize: 11,
                  fontWeight: 600,
                  color: style === 'bold-colorful' ? colors.accent : colors.primary,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
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

function ModernMinimal({ custom, branding, menuItems, widthPx, heightPx, siteUrl }: Omit<MenuTemplateProps, 'style'>) {
  const { colors, fonts, showQR, showTagline } = custom;
  const pad = Math.round(widthPx * 0.06);
  const innerW = widthPx - pad * 2;

  return (
    <div
      style={{
        width: widthPx, height: heightPx,
        background: colors.background,
        padding: pad,
        fontFamily: fonts.body,
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: `2px solid ${colors.primary}`, paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontFamily: fonts.heading, fontSize: Math.round(widthPx * 0.055), fontWeight: 300, color: colors.primary, letterSpacing: '0.04em' }}>
          {branding.name}
        </div>
        {showTagline && branding.tagline && (
          <div style={{ fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, marginTop: 3, letterSpacing: '0.08em' }}>
            {branding.tagline}
          </div>
        )}
      </div>

      {/* Menu */}
      <div style={{ columnCount: custom.layout.columns === 2 && widthPx > 500 ? 2 : 1, columnGap: 24, width: innerW }}>
        {menuItems.map((cat) => (
          <DishList key={cat.id} cat={cat} custom={custom} style="modern-minimal" />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute', bottom: pad, left: pad, right: pad,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          borderTop: `1px solid ${colors.border}`, paddingTop: 8,
        }}
      >
        {showQR && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QRCodeSVG value={siteUrl} size={48} fgColor={colors.primary} bgColor="transparent" />
            <div style={{ fontSize: 8, color: colors.textMuted, fontFamily: fonts.body }}>Scan to view<br />full menu</div>
          </div>
        )}
        {branding.phone && (
          <div style={{ fontSize: 9, color: colors.textMuted, fontFamily: fonts.body, textAlign: 'right' }}>
            {branding.phone}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Classic Elegant ──────────────────────────────────────────────────────────

function ClassicElegant({ custom, branding, menuItems, widthPx, heightPx, siteUrl }: Omit<MenuTemplateProps, 'style'>) {
  const { colors, fonts, showQR, showTagline } = custom;
  const pad = Math.round(widthPx * 0.07);

  return (
    <div
      style={{
        width: widthPx, height: heightPx,
        background: colors.background,
        padding: pad,
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        border: `6px double ${colors.accent}`,
      }}
    >
      {/* Ornamental top */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: colors.accent, letterSpacing: '0.3em', marginBottom: 6 }}>✦ ✦ ✦</div>
        <div style={{ fontFamily: fonts.heading, fontSize: Math.round(widthPx * 0.06), fontWeight: 700, color: colors.primary, letterSpacing: '0.06em' }}>
          {branding.name}
        </div>
        {showTagline && branding.tagline && (
          <div style={{ fontFamily: fonts.body, fontSize: 9, color: colors.textMuted, marginTop: 4, fontStyle: 'italic', letterSpacing: '0.06em' }}>
            {branding.tagline}
          </div>
        )}
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${colors.accent}, transparent)`, marginTop: 10 }} />
      </div>

      {/* Menu */}
      <div style={{ columnCount: custom.layout.columns === 2 && widthPx > 500 ? 2 : 1, columnGap: 20 }}>
        {menuItems.map((cat) => (
          <DishList key={cat.id} cat={cat} custom={custom} style="classic-elegant" />
        ))}
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: pad, left: pad, right: pad, textAlign: 'center' }}>
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${colors.accent}, transparent)`, marginBottom: 8 }} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          {showQR && (
            <QRCodeSVG value={siteUrl} size={40} fgColor={colors.primary} bgColor="transparent" />
          )}
          {branding.phone && (
            <div style={{ fontSize: 9, color: colors.textMuted, fontFamily: fonts.body, fontStyle: 'italic' }}>
              {branding.phone}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bold Colorful ────────────────────────────────────────────────────────────

function BoldColorful({ custom, branding, menuItems, widthPx, heightPx, siteUrl }: Omit<MenuTemplateProps, 'style'>) {
  const { colors, fonts, showQR, showTagline } = custom;
  const pad = Math.round(widthPx * 0.05);
  const headerH = Math.round(heightPx * 0.18);

  return (
    <div
      style={{
        width: widthPx, height: heightPx,
        background: colors.background,
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: fonts.body,
      }}
    >
      {/* Coloured header band */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          height: headerH,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          padding: `0 ${pad}px`,
        }}
      >
        <div style={{ fontFamily: fonts.heading, fontSize: Math.round(widthPx * 0.065), fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {branding.name}
        </div>
        {showTagline && branding.tagline && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 3 }}>
            {branding.tagline}
          </div>
        )}
      </div>

      {/* Menu body */}
      <div style={{ padding: pad, columnCount: custom.layout.columns === 2 && widthPx > 500 ? 2 : 1, columnGap: 16 }}>
        {menuItems.map((cat) => (
          <DishList key={cat.id} cat={cat} custom={custom} style="bold-colorful" />
        ))}
      </div>

      {/* Bottom strip */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: colors.primary,
          padding: `8px ${pad}px`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        {showQR && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QRCodeSVG value={siteUrl} size={36} fgColor="#FFFFFF" bgColor="transparent" />
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', fontFamily: fonts.body }}>Scan to order</div>
          </div>
        )}
        {branding.phone && (
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)', fontFamily: fonts.body }}>
            {branding.phone}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

const MenuTemplate: React.FC<MenuTemplateProps> = (props) => {
  const rest = { ...props } as Omit<MenuTemplateProps, 'style'>;
  if (props.style === 'classic-elegant') return <ClassicElegant {...rest} />;
  if (props.style === 'bold-colorful') return <BoldColorful {...rest} />;
  return <ModernMinimal {...rest} />;
};

export default MenuTemplate;
