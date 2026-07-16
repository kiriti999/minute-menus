/**
 * StickerLayout — circle stickers are QR-focused; square/rectangle show categories + QR.
 */
import type { Category, DesignCustomization, RestaurantBranding } from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";
import {
	DEFAULT_QR_BORDER_COLOR,
	DEFAULT_QR_BORDER_WIDTH,
	type FormatInfo,
} from "../../lib/printDesigns";
import CompactMenuLayout from "./CompactMenuLayout";
import {
	effectiveFonts,
	formatPrintDisplayName,
	hexToRgba,
	titleFontFamily,
	titleStyleExtras,
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
	return <img src={url} alt="Logo" style={{ height, width: "auto", objectFit: "contain", display: "block" }} />;
}

function CircleQrBadge({
	siteUrl,
	qrSize,
	colors,
	size,
	borderWidth,
	borderColor,
}: {
	siteUrl: string;
	qrSize: number;
	colors: DesignCustomization["colors"];
	size: number;
	borderWidth: number;
	borderColor: string;
}) {
	const stroke = Math.max(0, borderWidth);
	const pad = Math.max(1, Math.round(stroke + 1));
	return (
		<div
			style={{
				padding: pad,
				borderRadius: Math.round(size * 0.028),
				background: "#FFF",
				border: stroke > 0 ? `${stroke}px solid ${borderColor}` : "none",
				boxSizing: "border-box",
			}}
		>
			<QRCodeSVG value={siteUrl} size={qrSize} fgColor={colors.primary} bgColor="#FFFFFF" level="H" />
		</div>
	);
}

function CircleSticker({
	customization,
	branding,
	widthPx,
	siteUrl,
}: Omit<StickerLayoutProps, "fmt" | "heightPx" | "menuItems">) {
	const fonts = effectiveFonts(customization);
	const { colors, showQR, showTagline, logoUrl } = customization;
	const size = widthPx;
	const ring = Math.max(4, Math.round(size * 0.024));
	const hasLogo = Boolean(logoUrl);
	const qrSize = Math.round(size * (hasLogo ? 0.32 : 0.36));
	const nameFs = Math.max(7, Math.round(size * 0.072));
	const innerPad = Math.round(size * 0.07);
	const displayName = formatPrintDisplayName(branding.name, customization.typography.textTransform);
	const titleFont = titleFontFamily(customization);
	const titleExtras = titleStyleExtras(customization);
	const innerBg = customization.backgroundType === "gradient" ? "#FFFFFF" : colors.background;
	const qrBorderWidth = customization.qrBorderWidth ?? DEFAULT_QR_BORDER_WIDTH;
	const qrBorderColor = customization.qrBorderColor ?? DEFAULT_QR_BORDER_COLOR;

	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: "50%",
				boxSizing: "border-box",
				background: `linear-gradient(145deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})`,
				padding: ring,
				boxShadow: `0 4px 18px ${hexToRgba(colors.primary, 0.22)}`,
			}}
		>
			<div
				style={{
					width: "100%",
					height: "100%",
					borderRadius: "50%",
					overflow: "hidden",
					position: "relative",
					background: innerBg,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					padding: innerPad,
					boxSizing: "border-box",
					fontFamily: fonts.body,
					gap: Math.round(size * 0.02),
				}}
			>
				<div
					aria-hidden
					style={{
						position: "absolute",
						inset: Math.round(size * 0.045),
						borderRadius: "50%",
						border: `1px dashed ${hexToRgba(colors.accent, 0.4)}`,
						pointerEvents: "none",
					}}
				/>

				{hasLogo && (
					<div style={{ flexShrink: 0, lineHeight: 0 }}>
						<Logo url={logoUrl} height={Math.round(size * 0.18)} />
					</div>
				)}

				{showQR && (
					<CircleQrBadge
						siteUrl={siteUrl}
						qrSize={qrSize}
						colors={colors}
						size={size}
						borderWidth={qrBorderWidth}
						borderColor={qrBorderColor}
					/>
				)}

				{!hasLogo && (
					<div style={{ textAlign: "center", maxWidth: "86%", zIndex: 1, flexShrink: 0 }}>
						<div
							style={{
								fontFamily: titleFont,
								fontSize: nameFs,
								fontWeight: 700,
								color: colors.primary,
								lineHeight: 1.15,
								...titleExtras,
							}}
						>
							{displayName}
						</div>
						{showTagline && branding.tagline && (
							<div
								style={{
									fontSize: Math.max(5, nameFs - 2),
									color: colors.textMuted,
									marginTop: 2,
									lineHeight: 1.2,
								}}
							>
								{branding.tagline}
							</div>
						)}
					</div>
				)}

				<div
					style={{
						marginTop: Math.round(size * 0.01),
						padding: `${Math.max(3, Math.round(size * 0.012))}px ${Math.round(size * 0.038)}px`,
						borderRadius: 999,
						background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
						color: "#FFF",
						fontSize: Math.max(5, Math.round(size * 0.045)),
						fontWeight: 600,
						letterSpacing: "0.14em",
						textTransform: "uppercase",
						flexShrink: 0,
						zIndex: 1,
					}}
				>
					Scan to order
				</div>
			</div>
		</div>
	);
}

const StickerLayout: React.FC<StickerLayoutProps> = (props) => {
	const shape = props.fmt.shape;
	const { colors } = props.customization;

	if (shape === "circle") return <CircleSticker {...props} />;

	const layout =
		shape === "square" ? "square" : props.widthPx > props.heightPx ? "landscape" : "portrait";
	const borderRadius =
		shape === "square" ? Math.round(props.widthPx * 0.06) : Math.round(props.widthPx * 0.04);

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
