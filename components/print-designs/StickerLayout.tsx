/**
 * StickerLayout — circle stickers are QR-focused; square/rectangle show categories + QR.
 */
import type { Category, DesignCustomization, RestaurantBranding } from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";
import type { FormatInfo } from "../../lib/printDesigns";
import CompactMenuLayout from "./CompactMenuLayout";
import {
  baseBackground,
  effectiveFonts,
} from "./menuStyleHelpers";

export interface StickerLayoutProps {
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
  return <img src={url} alt="Logo" style={{ height, width: 'auto', objectFit: 'contain' }} />;
}

function CircleSticker({ customization, branding, widthPx, siteUrl }: Omit<StickerLayoutProps, 'fmt' | 'heightPx' | 'menuItems'>) {
  const fonts = effectiveFonts(customization);
  const { colors, showQR, showTagline, logoUrl } = customization;
  const size = widthPx;
  const qrSize = Math.round(size * 0.42);
  const nameFs = Math.max(7, Math.round(size * 0.09));
  const pad = Math.round(size * 0.08);

  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden', position: 'relative',
        background: baseBackground(customization), border: `3px solid ${colors.primary}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: Math.round(size * 0.03), padding: pad, boxSizing: 'border-box', fontFamily: fonts.body,
      }}
    >
      {logoUrl && <Logo url={logoUrl} height={Math.round(size * 0.12)} />}
      {showQR && <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor={colors.background} level="H" />}
      <div style={{ textAlign: 'center', maxWidth: '90%' }}>
        <div style={{ fontFamily: fonts.heading, fontSize: nameFs, fontWeight: 700, color: colors.primary, lineHeight: 1.1 }}>
          {branding.name || 'Restaurant'}
        </div>
        {showTagline && branding.tagline && (
          <div style={{ fontSize: Math.max(6, nameFs - 2), color: colors.textMuted, marginTop: 2 }}>{branding.tagline}</div>
        )}
      </div>
      <div style={{ fontSize: Math.max(5, Math.round(size * 0.055)), color: colors.textMuted }}>Scan to order</div>
    </div>
  );
}

const StickerLayout: React.FC<StickerLayoutProps> = (props) => {
  const shape = props.fmt.shape;
  const { colors } = props.customization;

  if (shape === 'circle') return <CircleSticker {...props} />;

  const layout = shape === 'square' ? 'square' : (props.widthPx > props.heightPx ? 'landscape' : 'portrait');
  const borderRadius = shape === 'square'
    ? Math.round(props.widthPx * 0.06)
    : Math.round(props.widthPx * 0.04);

  return (
    <CompactMenuLayout
      customization={props.customization}
      branding={props.branding}
      menuItems={props.menuItems}
      widthPx={props.widthPx}
      heightPx={props.heightPx}
      siteUrl={props.siteUrl}
      border={`2px solid ${colors.primary}`}
      borderRadius={borderRadius}
      layout={layout}
    />
  );
};

export default StickerLayout;
