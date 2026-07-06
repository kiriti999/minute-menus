/**
 * StickerLayout — QR-focused layouts for circle, square, and rectangle stickers.
 */
import type { DesignCustomization, RestaurantBranding } from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";
import type { FormatInfo } from "../../lib/printDesigns";
import {
  baseBackground,
  effectiveFonts,
  scaledDescFs,
  scaledHeadingFs,
} from "./menuStyleHelpers";

export interface StickerLayoutProps {
  customization: DesignCustomization;
  branding: RestaurantBranding;
  fmt: FormatInfo;
  widthPx: number;
  heightPx: number;
  siteUrl: string;
}

function Logo({ url, height }: { url?: string; height: number }) {
  if (!url) return null;
  return <img src={url} alt="Logo" style={{ height, width: 'auto', objectFit: 'contain' }} />;
}

function CircleSticker({ customization, branding, widthPx, siteUrl }: Omit<StickerLayoutProps, 'fmt' | 'heightPx'>) {
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

function SquareSticker({ customization, branding, widthPx, heightPx, siteUrl }: Omit<StickerLayoutProps, 'fmt'>) {
  const fonts = effectiveFonts(customization);
  const { colors, showQR, showTagline, logoUrl } = customization;
  const qrSize = Math.round(Math.min(widthPx, heightPx) * 0.5);
  const pad = Math.round(widthPx * 0.08);
  const hfs = Math.max(8, scaledHeadingFs(widthPx, customization) * 0.55);

  return (
    <div
      style={{
        width: widthPx, height: heightPx, position: 'relative', boxSizing: 'border-box',
        background: baseBackground(customization), border: `2px solid ${colors.primary}`,
        borderRadius: Math.round(widthPx * 0.06), display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: Math.round(widthPx * 0.04),
        padding: pad, fontFamily: fonts.body,
      }}
    >
      {logoUrl && <Logo url={logoUrl} height={Math.round(heightPx * 0.14)} />}
      {showQR && <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor={colors.background} level="H" />}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: fonts.heading, fontSize: hfs, fontWeight: 700, color: colors.primary }}>{branding.name || 'Restaurant'}</div>
        {showTagline && branding.tagline && (
          <div style={{ fontSize: scaledDescFs(widthPx, customization), color: colors.textMuted }}>{branding.tagline}</div>
        )}
      </div>
    </div>
  );
}

function RectSticker({ customization, branding, widthPx, heightPx, siteUrl }: Omit<StickerLayoutProps, 'fmt'>) {
  const fonts = effectiveFonts(customization);
  const { colors, showQR, showTagline, logoUrl } = customization;
  const isLandscape = widthPx > heightPx;
  const qrSize = Math.round(Math.min(widthPx, heightPx) * 0.65);
  const pad = Math.round(widthPx * 0.06);
  const hfs = Math.max(8, scaledHeadingFs(widthPx, customization) * 0.5);

  return (
    <div
      style={{
        width: widthPx, height: heightPx, position: 'relative', boxSizing: 'border-box',
        background: baseBackground(customization), border: `2px solid ${colors.primary}`,
        borderRadius: Math.round(widthPx * 0.04), display: 'flex',
        flexDirection: isLandscape ? 'row' : 'column',
        alignItems: 'center', justifyContent: 'center', gap: Math.round(widthPx * 0.04),
        padding: pad, fontFamily: fonts.body,
      }}
    >
      {showQR && <QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor={colors.background} level="H" />}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isLandscape ? 'flex-start' : 'center', gap: 2 }}>
        {logoUrl && <Logo url={logoUrl} height={Math.round(heightPx * 0.22)} />}
        <div style={{ fontFamily: fonts.heading, fontSize: hfs, fontWeight: 700, color: colors.primary }}>{branding.name || 'Restaurant'}</div>
        {showTagline && branding.tagline && (
          <div style={{ fontSize: scaledDescFs(widthPx, customization), color: colors.textMuted }}>{branding.tagline}</div>
        )}
        {branding.phone && <div style={{ fontSize: scaledDescFs(widthPx, customization), color: colors.textMuted }}>{branding.phone}</div>}
      </div>
    </div>
  );
}

const StickerLayout: React.FC<StickerLayoutProps> = (props) => {
  const shape = props.fmt.shape;
  if (shape === 'circle') return <CircleSticker {...props} />;
  if (shape === 'square') return <SquareSticker {...props} />;
  return <RectSticker {...props} />;
};

export default StickerLayout;
