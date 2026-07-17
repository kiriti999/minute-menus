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
	return (
		<img
			src={url}
			alt="Logo"
			style={{ height, maxHeight: height, width: "auto", maxWidth: "100%", objectFit: "contain", display: "block" }}
		/>
	);
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

/**
 * Absolute Y positions with four equal gaps (above / between / below).
 * Avoids flex space-evenly, which reflows when print/html2canvas font metrics differ.
 */
function circleStickerLayout(size: number, hasLogo: boolean, showQR: boolean, qrBorderWidth: number) {
	const pad = Math.round(size * 0.10);
	const innerH = size - 2 * pad;
	const freeForGaps = Math.round(innerH * 0.22);
	const contentBudget = innerH - freeForGaps;
	const ctaFs = Math.max(6, Math.round(size * 0.034));
	const ctaPadY = Math.max(4, Math.round(size * 0.016));
	const ctaH = Math.ceil(ctaFs * 1.35) + ctaPadY * 2;
	const stroke = Math.max(0, qrBorderWidth);
	const qrPad = Math.max(1, Math.round(stroke + 1));
	const qrChrome = 2 * qrPad + (stroke > 0 ? 2 * stroke : 0);
	const nameFs = Math.max(7, Math.round(size * 0.062));
	const textHeaderH = Math.ceil(nameFs * 1.2) + 2;
	const logoH = hasLogo ? Math.round(Math.min(size * 0.22, contentBudget * 0.4)) : 0;
	const headerH = hasLogo ? logoH : textHeaderH;
	const qrRoom = Math.max(20, contentBudget - ctaH - headerH - qrChrome);
	const qrCap = Math.round(size * (hasLogo ? 0.24 : 0.26));
	const qrSize = showQR ? Math.min(qrCap, qrRoom) : 0;
	const qrOuterH = showQR ? qrSize + qrChrome : 0;
	const blocks = 2 + (showQR ? 1 : 0);
	const gapCount = blocks + 1;
	const used = headerH + qrOuterH + ctaH;
	const gap = Math.max(4, Math.floor((innerH - used) / gapCount));
	const headerTop = pad + gap;
	const qrTop = headerTop + headerH + gap;
	const ctaTop = showQR ? qrTop + qrOuterH + gap : headerTop + headerH + gap;
	return { pad, ctaFs, ctaPadY, logoH, nameFs, qrSize, headerTop, qrTop, ctaTop };
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
	const hasLogo = Boolean(logoUrl?.trim());
	const qrBorderWidth = customization.qrBorderWidth ?? DEFAULT_QR_BORDER_WIDTH;
	const qrBorderColor = customization.qrBorderColor ?? DEFAULT_QR_BORDER_COLOR;
	const s = circleStickerLayout(size, hasLogo, Boolean(showQR), qrBorderWidth);
	const displayName = formatPrintDisplayName(
		branding.name?.trim() || "Restaurant",
		customization.typography.textTransform,
	);
	const titleFont = titleFontFamily(customization);
	const titleExtras = titleStyleExtras(customization);
	/** Flex-center band — no translateX(-50%); html2canvas shifts transformed text. */
	const band = (top: number): React.CSSProperties => ({
		position: "absolute",
		top,
		left: 0,
		width: "100%",
		display: "flex",
		justifyContent: "center",
		zIndex: 1,
		boxSizing: "border-box",
		paddingLeft: s.pad,
		paddingRight: s.pad,
	});

	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: "50%",
				boxSizing: "border-box",
				background: colors.background,
				overflow: "hidden",
				position: "relative",
				fontFamily: fonts.body,
			}}
		>
			<div
				aria-hidden
				style={{
					position: "absolute",
					inset: Math.round(size * 0.045),
					borderRadius: "50%",
					border: "1px dashed #000000",
					pointerEvents: "none",
				}}
			/>

			{hasLogo ? (
				<div style={{ ...band(s.headerTop), lineHeight: 0 }}>
					<div style={{ maxHeight: s.logoH, lineHeight: 0 }}>
						<Logo url={logoUrl} height={s.logoH} />
					</div>
				</div>
			) : (
				<div style={band(s.headerTop)}>
					<div style={{ textAlign: "center", maxWidth: "86%" }}>
						<div
							style={{
								fontFamily: titleFont,
								fontSize: s.nameFs,
								fontWeight: 700,
								color: colors.primary,
								lineHeight: 1.2,
								...titleExtras,
							}}
						>
							{displayName}
						</div>
						{showTagline && branding.tagline && (
							<div
								style={{
									fontSize: Math.max(5, s.nameFs - 2),
									color: colors.textMuted,
									marginTop: 2,
									lineHeight: 1.2,
								}}
							>
								{branding.tagline}
							</div>
						)}
					</div>
				</div>
			)}

			{showQR && (
				<div style={band(s.qrTop)}>
					<CircleQrBadge
						siteUrl={siteUrl}
						qrSize={s.qrSize}
						colors={colors}
						size={size}
						borderWidth={qrBorderWidth}
						borderColor={qrBorderColor}
					/>
				</div>
			)}

			<div style={band(s.ctaTop)}>
				<div
					style={{
						maxWidth: "78%",
						boxSizing: "border-box",
						padding: `${s.ctaPadY}px ${Math.round(size * 0.032)}px`,
						borderRadius: 999,
						background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
						color: "#FFF",
						fontSize: s.ctaFs,
						fontWeight: 600,
						letterSpacing: "0.06em",
						textTransform: "uppercase",
						textAlign: "center",
						lineHeight: 1.35,
						whiteSpace: "nowrap",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
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
