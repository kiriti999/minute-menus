/**
 * Hiring pamphlet — bold "We Are Hiring" layout for print / PDF export.
 */
import type {
	DesignCustomization,
	EnglishSkillLevel,
	JobFlyerContent,
	JobEmploymentType,
	RestaurantBranding,
	TemplateStyle,
} from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";
import { TEMPLATE_VISUALS } from "../../lib/templateConfig";
import { buildJobFlyerApplyMessage } from "../../lib/jobFlyerWhatsApp";
import { computeJobFlyerSizing, isJobFlyerPamphlet } from "../../lib/jobFlyerMetrics";
import { jobFlyerMapsTarget } from "../../lib/mapsLink";
import { whatsAppChatUrl } from "../../lib/whatsappLink";
import {
	baseBackground,
	containerRadius,
	containerShadow,
	effectiveFonts,
	formatPrintDisplayName,
	headingWeight,
	hexToRgba,
	outerBorderCss,
	textTransformCss,
	titleFontFamily,
	titleStyleExtras,
} from "./menuStyleHelpers";
import { PrintBackgroundLayers } from "./PrintBackgroundLayers";

const ENGLISH_LABELS: Record<EnglishSkillLevel, string> = {
	required: "Required",
	preferred: "Preferred",
	"not-required": "Not required",
};

const EMPLOYMENT_LABELS: Record<JobEmploymentType, string> = {
	"part-time": "Part-time",
	"full-time": "Full-time",
};

type DetailItem = { icon: string; label: string; value: string };

function JobDetailCard({
	item,
	labelFs,
	valueFs,
	colors,
}: {
	item: DetailItem;
	labelFs: number;
	valueFs: number;
	colors: DesignCustomization["colors"];
}) {
	if (!item.value.trim()) return null;
	const padY = Math.max(6, Math.round(valueFs * 0.55));
	const padX = Math.max(8, Math.round(valueFs * 0.7));
	const gap = Math.max(6, Math.round(valueFs * 0.55));
	return (
		<div
			style={{
				display: "flex",
				alignItems: "flex-start",
				gap,
				padding: `${padY}px ${padX}px`,
				borderRadius: Math.max(6, Math.round(valueFs * 0.5)),
				background: hexToRgba(colors.background, 0.92),
				border: `1px solid ${hexToRgba(colors.border, 0.85)}`,
			}}
		>
			<div
				style={{
					width: Math.round(labelFs * 2),
					height: Math.round(labelFs * 2),
					borderRadius: "50%",
					flexShrink: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: Math.round(labelFs * 1.1),
					background: hexToRgba(colors.secondary, 0.18),
					color: colors.primary,
				}}
			>
				{item.icon}
			</div>
			<div style={{ minWidth: 0, flex: 1 }}>
				<div
					style={{
						fontSize: labelFs,
						fontWeight: 700,
						textTransform: "uppercase",
						letterSpacing: "0.05em",
						color: colors.textMuted,
						marginBottom: 2,
					}}
				>
					{item.label}
				</div>
				<div style={{ fontSize: valueFs, fontWeight: 700, color: colors.text, lineHeight: 1.32 }}>{item.value}</div>
			</div>
		</div>
	);
}

function JobFlyerQrPanel({
	label,
	url,
	imageUrl,
	emptyHint,
	qrSize,
	smallFs,
	colors,
	compact,
}: {
	label: string;
	url: string | null;
	imageUrl?: string | null;
	emptyHint: string;
	qrSize: number;
	smallFs: number;
	colors: DesignCustomization["colors"];
	compact?: boolean;
}) {
	const labelFs = Math.max(7, Math.round(smallFs * (compact ? 0.85 : 0.92)));
	const panelPad = compact ? 4 : 6;
	const customImage = imageUrl?.trim();
	if (customImage || url) {
		return (
			<div
				style={{
					flexShrink: 0,
					textAlign: "center",
					padding: panelPad,
					borderRadius: compact ? 8 : 10,
					background: "#FFFFFF",
					border: `1px solid ${hexToRgba(colors.border, 0.85)}`,
					boxShadow: `0 2px 10px ${hexToRgba(colors.primary, 0.08)}`,
				}}
			>
				<p style={{ margin: "0 0 3px", fontSize: labelFs, fontWeight: 700, color: colors.text, lineHeight: 1.15 }}>
					{label}
				</p>
				{customImage ? (
					<img
						src={customImage}
						alt={label}
						width={qrSize}
						height={qrSize}
						style={{
							width: qrSize,
							height: qrSize,
							objectFit: "contain",
							display: "block",
							margin: "0 auto",
						}}
					/>
				) : (
					<QRCodeSVG
						value={url!}
						size={qrSize}
						level="M"
						bgColor="#FFFFFF"
						fgColor="#111111"
						marginSize={2}
					/>
				)}
			</div>
		);
	}
	return (
		<div
			style={{
				flexShrink: 0,
				width: qrSize + 12,
				padding: 8,
				borderRadius: 10,
				border: `2px dashed ${hexToRgba(colors.border, 0.85)}`,
				textAlign: "center",
				fontSize: labelFs,
				fontWeight: 600,
				color: colors.textMuted,
				lineHeight: 1.25,
			}}
		>
			{emptyHint}
		</div>
	);
}

export interface JobFlyerLayoutProps {
	style: TemplateStyle;
	customization: DesignCustomization;
	branding: RestaurantBranding;
	jobFlyer: JobFlyerContent;
	widthPx: number;
	heightPx: number;
	siteUrl: string;
}

export const JobFlyerLayout: React.FC<JobFlyerLayoutProps> = ({
	style,
	customization,
	branding,
	jobFlyer,
	widthPx,
	heightPx,
	siteUrl: _siteUrl,
}) => {
	const { colors } = customization;
	const fonts = effectiveFonts(customization);
	const visual = TEMPLATE_VISUALS[style];
	const border = outerBorderCss(visual, customization);
	const radius = containerRadius(customization);
	const shadow = containerShadow(customization);
	const hw = headingWeight(customization);
	const nameTransform = textTransformCss(customization);
	const pamphlet = isJobFlyerPamphlet(widthPx, heightPx);
	const descriptionText = jobFlyer.jobDescription?.trim() ?? "";
	const hasNotes = Boolean(jobFlyer.extraNotes?.trim());
	const sizing = computeJobFlyerSizing({
		widthPx,
		heightPx,
		pamphlet,
		descriptionText,
		hasNotes,
		showQr: customization.showQR || Boolean(jobFlyer.locationText?.trim() || jobFlyer.mapsUrl?.trim()),
		detailCount: 6,
		baseHeadingFs: 18,
		baseBodyFs: 11,
	});
	const {
		pad,
		gap,
		headingFs,
		smallFs,
		descFs,
		bannerFs,
		qrSize,
		detailLabelFs,
		detailValueFs,
		useCompactQrRow,
		detailGap,
		headerPadY,
	} = sizing;
	const displayName = formatPrintDisplayName(branding.name, customization.typography.textTransform);
	const titleFont = titleFontFamily(customization);
	const titleExtras = titleStyleExtras(customization);
	const detailCols = widthPx < 400 ? 1 : 2;

	const applyMessage = buildJobFlyerApplyMessage(jobFlyer, branding.name);
	const whatsAppUrl = branding.phone ? whatsAppChatUrl(branding.phone, applyMessage) : null;
	const mapsTarget = jobFlyerMapsTarget(jobFlyer.locationText, jobFlyer.mapsUrl);
	const showMapsQr = Boolean(jobFlyer.locationText?.trim() || jobFlyer.mapsUrl?.trim());
	const bothQrs = customization.showQR && showMapsQr;
	const phoneDigits = branding.phone?.replace(/\D/g, "") ?? "";
	const phoneDisplay =
		phoneDigits.length >= 10 ? phoneDigits.slice(-10) : branding.phone?.trim() || "";

	const details: DetailItem[] = [
		{ icon: "⏰", label: "Timings", value: jobFlyer.timings },
		{ icon: "💰", label: "Salary", value: jobFlyer.salary },
		{ icon: "📍", label: "Location", value: jobFlyer.locationText?.trim() || "" },
		{ icon: "👤", label: "Min. age", value: jobFlyer.minAge },
		{ icon: "🎓", label: "Qualification", value: jobFlyer.qualification },
		{ icon: "🗣", label: "English", value: ENGLISH_LABELS[jobFlyer.englishSkill] },
	];

	return (
		<div
			style={{
				width: widthPx,
				height: heightPx,
				boxSizing: "border-box",
				display: "flex",
				flexDirection: "column",
				fontFamily: fonts.body,
				color: colors.text,
				background: baseBackground(customization),
				border: border === "none" ? undefined : border,
				borderRadius: radius,
				boxShadow: shadow === "none" ? undefined : shadow,
				overflow: "hidden",
				position: "relative",
			}}
		>
			<PrintBackgroundLayers customization={customization} />
			<div
				style={{
					flexShrink: 0,
					background: `linear-gradient(135deg, ${colors.primary} 0%, ${hexToRgba(colors.primary, 0.88)} 55%, ${colors.secondary} 100%)`,
					padding: `${headerPadY}px ${pad}px ${Math.round(headerPadY * 0.85)}px`,
					textAlign: "center",
					position: "relative",
				}}
			>
				<div
					style={{
						position: "absolute",
						inset: 0,
						opacity: 0.08,
						backgroundImage: `repeating-linear-gradient(-45deg, #fff 0, #fff 2px, transparent 2px, transparent 10px)`,
						pointerEvents: "none",
					}}
				/>
				<div
					style={{
						fontSize: bannerFs,
						fontWeight: hw,
						letterSpacing: "0.12em",
						textTransform: "uppercase",
						color: colors.background,
						fontFamily: titleFont,
						...titleExtras,
					}}
				>
					We Are Hiring!
				</div>
				<div
					style={{
						marginTop: 5,
						display: "inline-block",
						fontSize: smallFs,
						fontWeight: 700,
						letterSpacing: "0.06em",
						textTransform: "uppercase",
						color: colors.primary,
						background: colors.background,
						padding: "4px 12px",
						borderRadius: 999,
						whiteSpace: "nowrap",
						lineHeight: 1.2,
					}}
				>
					{EMPLOYMENT_LABELS[jobFlyer.employmentType]} position
				</div>
			</div>

			<div
				style={{
					flex: 1,
					minHeight: 0,
					padding: pad,
					display: "flex",
					flexDirection: "column",
					gap,
				}}
			>
				<div style={{ flexShrink: 0, textAlign: "center" }}>
					{customization.logoUrl?.trim() ? (
						<img
							src={customization.logoUrl}
							alt={displayName || "Logo"}
							style={{
								height: Math.round(Math.min(heightPx * (useCompactQrRow ? 0.08 : 0.1), widthPx * 0.24)),
								width: "auto",
								maxWidth: "70%",
								objectFit: "contain",
								display: "block",
								margin: "0 auto 6px",
							}}
						/>
					) : (
						displayName && (
							<p
								style={{
									margin: "0 0 4px",
									fontSize: Math.max(12, Math.round(headingFs * 0.48)),
									fontFamily: titleFont,
									fontWeight: hw,
									color: colors.primary,
									lineHeight: 1.15,
									textTransform: nameTransform,
									...titleExtras,
								}}
							>
								{displayName}
							</p>
						)
					)}
					<h1
						style={{
							margin: 0,
							fontSize: headingFs,
							fontFamily: titleFont,
							fontWeight: hw,
							color: colors.primary,
							lineHeight: 1.05,
							textTransform: nameTransform,
							...titleExtras,
						}}
					>
						{jobFlyer.roleTitle.trim() || "Part time — Cloud Kitchen"}
					</h1>
					{jobFlyer.hookLine?.trim() && (
						<p
							style={{
								margin: "4px auto 0",
								maxWidth: "94%",
								fontSize: smallFs,
								fontWeight: 600,
								color: colors.accent,
								lineHeight: 1.3,
							}}
						>
							{jobFlyer.hookLine.trim()}
						</p>
					)}
				</div>

				<div
					style={{
						flexShrink: 0,
						display: "grid",
						gridTemplateColumns: `repeat(${detailCols}, minmax(0, 1fr))`,
						gap: detailGap,
					}}
				>
					{details.map((item) => (
						<JobDetailCard
							key={item.label}
							item={item}
							labelFs={detailLabelFs}
							valueFs={detailValueFs}
							colors={colors}
						/>
					))}
				</div>

				{jobFlyer.extraNotes?.trim() && (
					<div
						style={{
							flexShrink: 0,
							padding: useCompactQrRow ? "6px 10px" : "8px 12px",
							borderRadius: 6,
							borderLeft: `3px solid ${colors.accent}`,
							background: hexToRgba(colors.accent, 0.1),
							fontSize: Math.max(8, Math.round(smallFs * 0.94)),
							color: colors.text,
							lineHeight: 1.32,
						}}
					>
						<strong style={{ color: colors.primary }}>Note: </strong>
						{jobFlyer.extraNotes.trim()}
					</div>
				)}

				{descriptionText && (
					<div
						style={{
							flexShrink: 0,
							padding: `${Math.max(6, Math.round(descFs * 0.55))}px ${Math.max(8, Math.round(descFs * 0.75))}px`,
							borderRadius: Math.max(6, Math.round(descFs * 0.5)),
							background: hexToRgba(colors.background, 0.7),
							border: `1px solid ${hexToRgba(colors.border, 0.75)}`,
							fontSize: descFs,
							color: colors.text,
							lineHeight: 1.32,
							whiteSpace: "pre-line",
						}}
					>
						{descriptionText}
					</div>
				)}

				<div style={{ flex: 1, minHeight: 0 }} />

				{phoneDisplay && (
					<div
						style={{
							flexShrink: 0,
							textAlign: "center",
							fontSize: Math.max(smallFs, Math.round(descFs * 1.02)),
							fontWeight: 700,
							color: "#FFFFFF",
							lineHeight: 1.2,
							padding: `${Math.max(6, Math.round(smallFs * 0.45))}px ${Math.max(10, Math.round(smallFs * 0.8))}px`,
							borderRadius: Math.max(6, Math.round(smallFs * 0.45)),
							background: colors.primary,
							letterSpacing: "0.01em",
						}}
					>
						WhatsApp your details on &quot;{phoneDisplay}&quot;
					</div>
				)}
				{(customization.showQR || showMapsQr) && (
					<div
						style={{
							flexShrink: 0,
							display: "flex",
							flexDirection: "row",
							flexWrap: "nowrap",
							justifyContent: "center",
							alignItems: "flex-start",
							gap: bothQrs ? Math.max(10, Math.round(qrSize * (useCompactQrRow ? 0.08 : 0.12))) : 10,
						}}
					>
						{customization.showQR && (
							<JobFlyerQrPanel
								label="Scan & Share CV"
								url={whatsAppUrl}
								imageUrl={jobFlyer.whatsAppQrImageUrl}
								emptyHint="Add WhatsApp number or upload QR above"
								qrSize={qrSize}
								smallFs={smallFs}
								colors={colors}
								compact={useCompactQrRow}
							/>
						)}
						{showMapsQr && (
							<JobFlyerQrPanel
								label="Find us on Maps"
								url={mapsTarget}
								emptyHint="Add location or Maps link"
								qrSize={qrSize}
								smallFs={smallFs}
								colors={colors}
								compact={useCompactQrRow}
							/>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
