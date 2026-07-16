/**
 * CompactMenuLayout — category-grouped menu + QR for pocket cards and non-circle stickers.
 */
import type { Category, DesignCustomization, RestaurantBranding } from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";
import {
  baseBackground,
  compactMaxItemsPerCategory,
  compactMenuScale,
  compactQrSize,
  containerRadius,
  containerShadow,
  effectiveFonts,
  formatPrintDisplayName,
  priceColor,
  scaledBodyFs,
  scaledCatFs,
  scaledHeadingFs,
  scaledPriceFs,
  titleFontFamily,
  titleStyleExtras,
} from "./menuStyleHelpers";

export interface CompactMenuLayoutProps {
  customization: DesignCustomization;
  branding: RestaurantBranding;
  menuItems: Category[];
  widthPx: number;
  heightPx: number;
  siteUrl: string;
  border?: string;
  borderRadius?: number | string;
  layout?: 'landscape' | 'portrait' | 'square';
  qrAlign?: 'center-right' | 'bottom-right';
}

function Logo({ url, height }: { url?: string; height: number }) {
  if (!url) return null;
  return <img src={url} alt="Logo" style={{ height, width: 'auto', objectFit: 'contain', display: 'block' }} />;
}

function CompactCategory({
  cat,
  maxItems,
  bfs,
  pfs,
  cfs,
  colors,
  fonts,
  showPrices,
}: {
  cat: Category;
  maxItems: number;
  bfs: number;
  pfs: number;
  cfs: number;
  colors: DesignCustomization['colors'];
  fonts: ReturnType<typeof effectiveFonts>;
  showPrices: boolean;
}) {
  const items = cat.items.slice(0, maxItems);
  const priceInk = priceColor(colors);
  return (
    <div style={{ breakInside: 'avoid', marginBottom: Math.round(cfs * 0.4) }}>
      <div style={{
        fontFamily: fonts.heading, fontSize: cfs, fontWeight: 700, color: colors.primary,
        borderBottom: `1px solid ${colors.border}`, marginBottom: 2, paddingBottom: 1,
        textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.1,
      }}>
        {cat.title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((dish) => (
          <div key={dish.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 4, lineHeight: 1.15 }}>
            <span style={{
              fontFamily: fonts.body, fontSize: bfs, color: colors.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0,
            }}>
              {dish.name}
            </span>
            {showPrices && dish.price != null && (
              <span style={{ fontFamily: fonts.price, fontSize: pfs, fontWeight: 700, color: priceInk, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                ₹{dish.price}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const CompactMenuLayout: React.FC<CompactMenuLayoutProps> = ({
  customization,
  branding,
  menuItems,
  widthPx,
  heightPx,
  siteUrl,
  border,
  borderRadius,
  layout,
  qrAlign = 'center-right',
}) => {
  const fonts = effectiveFonts(customization);
  const { colors, showQR, showPrices, logoUrl } = customization;
  const scale = compactMenuScale(widthPx, heightPx);
  const bfs = Math.max(5, Math.round(scaledBodyFs(widthPx, customization) * scale));
  const pfs = Math.max(bfs + 1, Math.round(scaledPriceFs(widthPx, bfs) * scale));
  const cfs = Math.max(6, Math.round(scaledCatFs(widthPx, customization) * scale));
  const hfs = Math.max(7, Math.round(scaledHeadingFs(widthPx, customization) * scale * 0.65));
  const pad = Math.round(Math.min(widthPx, heightPx) * 0.05);
  const maxItems = compactMaxItemsPerCategory(widthPx, heightPx);
  const isLandscape = layout === 'landscape' || (layout !== 'square' && widthPx > heightPx * 1.15);
  const qrSize = compactQrSize(widthPx, heightPx);
  const qrLabelFs = Math.max(4, bfs - 1);
  const qrBlockH = qrSize + qrLabelFs + 4;
  const cols = isLandscape && widthPx > heightPx * 1.3 ? 2 : 1;
  const resolvedRadius = borderRadius ?? containerRadius(customization);
  const displayName = formatPrintDisplayName(branding.name, customization.typography.textTransform);
  const titleFont = titleFontFamily(customization);
  const titleExtras = titleStyleExtras(customization);
  const qrAtBottomRight = qrAlign === 'bottom-right';

  return (
    <div style={{
      width: widthPx, height: heightPx, position: 'relative', boxSizing: 'border-box', overflow: 'hidden',
      background: baseBackground(customization), border: border ?? `1px solid ${colors.border}`,
      borderRadius: resolvedRadius, boxShadow: containerShadow(customization),
      padding: pad, fontFamily: fonts.body, display: 'flex', flexDirection: 'column', gap: Math.round(pad * 0.4),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {logoUrl && <Logo url={logoUrl} height={Math.round(hfs * 1.4)} />}
        <div style={{
          fontFamily: titleFont, fontSize: hfs, fontWeight: 700, color: colors.primary,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          ...titleExtras,
        }}>
          {displayName || 'Restaurant'}
        </div>
      </div>

      <div style={{
        flex: 1, minHeight: 0, position: 'relative',
        display: 'flex',
        flexDirection: isLandscape ? 'row' : 'column',
        gap: Math.round(pad * 0.5),
        alignItems: isLandscape ? 'stretch' : 'flex-start',
      }}>
        <div style={{
          flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden',
          display: 'grid', gridTemplateColumns: cols > 1 ? '1fr 1fr' : '1fr',
          gap: Math.round(pad * 0.4), alignContent: 'start',
          paddingRight: showQR && qrAtBottomRight ? qrSize + 4 : undefined,
          paddingBottom: showQR && qrAtBottomRight ? qrBlockH : undefined,
        }}>
          {menuItems.map((cat) => (
            <CompactCategory
              key={cat.id}
              cat={cat}
              maxItems={maxItems}
              bfs={bfs}
              pfs={pfs}
              cfs={cfs}
              colors={colors}
              fonts={fonts}
              showPrices={showPrices}
            />
          ))}
        </div>

        {showQR && qrAtBottomRight && (
          <div style={{
            position: 'absolute', right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1,
          }}>
            <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor={colors.background} level="H" />
            <div style={{ fontSize: qrLabelFs, color: colors.textMuted, textAlign: 'right', lineHeight: 1 }}>Scan menu</div>
          </div>
        )}

        {showQR && !qrAtBottomRight && (
          <div style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: isLandscape ? 'center' : 'flex-end',
            gap: 2,
          }}>
            <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor={colors.background} level="H" />
            <div style={{ fontSize: qrLabelFs, color: colors.textMuted, textAlign: 'right' }}>Scan menu</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompactMenuLayout;
