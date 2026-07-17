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
import { QRCodeCanvas } from "qrcode.react";
import type React from "react";
import { TEMPLATE_VISUALS } from "../../lib/templateConfig";
import { buildJobFlyerApplyMessage } from "../../lib/jobFlyerWhatsApp";
import { computeJobFlyerSizing } from "../../lib/jobFlyerMetrics";
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
	scaledBodyFs,
	scaledHeadingFs,
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
	return (
		<div
			style={{
				display: "flex",
				alignItems: "flex-start",
				gap: 7,
				padding: "8px 10px",
				borderRadius: 8,
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
	emptyHint,
	qrSize,
	smallFs,
	colors,
}: {
	label: string;
	url: string | null;
	emptyHint: string;
	qrSize: number;
	smallFs: number;
	colors: DesignCustomization["colors"];
}) {
	const labelFs = Math.max(8, Math.round(smallFs * 0.92));
	if (url) {
		return (
			<div
				style={{
					flexShrink: 0,
					textAlign: "center",
					padding: 6,
					borderRadius: 10,
					background: "#FFFFFF",
					border: `1px solid ${hexToRgba(colors.border, 0.85)}`,
					boxShadow: `0 2px 10px ${hexToRgba(colors.primary, 0.08)}`,
				}}
			>
				<p style={{ margin: "0 0 4px", fontSize: labelFs, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>
					{label}
				</p>
				<QRCodeCanvas value={url} size={qrSize} level="H" bgColor="#FFFFFF" fgColor="#111111" />
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
	const pamphlet = heightPx <= 860;
	const descriptionText = jobFlyer.jobDescription?.trim() ?? "";
	const hasNotes = Boolean(jobFlyer.extraNotes?.trim());
	const sizing = computeJobFlyerSizing({
		widthPx,
		heightPx,
		pamphlet,
		descriptionText,
		hasNotes,
		showQr: customization.showQR,
		detailCount: 5,
		baseHeadingFs: scaledHeadingFs(widthPx, customization),
		baseBodyFs: scaledBodyFs(widthPx, customization),
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
	const mapQrSize = bothQrs ? Math.round(qrSize * 0.9) : qrSize;

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
					padding: `${Math.round(pad * 0.7)}px ${pad}px ${Math.round(pad * 0.55)}px`,
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
						padding: "3px 10px",
						borderRadius: 999,
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
								height: Math.round(Math.min(heightPx * 0.12, widthPx * 0.28)),
								width: "auto",
								maxWidth: "75%",
								objectFit: "contain",
								display: "block",
								margin: "0 auto 8px",
							}}
						/>
					) : (
						displayName && (
							<p
								style={{
									margin: "0 0 6px",
									fontSize: Math.max(14, Math.round(headingFs * 0.48)),
									fontFamily: titleFont,
									fontWeight: hw,
									color: colors.primary,
									lineHeight: 1.2,
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
								margin: "6px auto 0",
								maxWidth: "94%",
								fontSize: smallFs,
								fontWeight: 600,
								color: colors.accent,
								lineHeight: 1.34,
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
						gap: 8,
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
							padding: "8px 12px",
							borderRadius: 6,
							borderLeft: `3px solid ${colors.accent}`,
							background: hexToRgba(colors.accent, 0.1),
							fontSize: Math.max(8, Math.round(smallFs * 0.94)),
							color: colors.text,
							lineHeight: 1.36,
						}}
					>
						<strong style={{ color: colors.primary }}>Note: </strong>
						{jobFlyer.extraNotes.trim()}
					</div>
				)}

				{(descriptionText || customization.showQR || showMapsQr) && (
					<div
						style={{
							flexShrink: 0,
							display: "flex",
							flexDirection: useCompactQrRow ? "row" : "column",
							alignItems: useCompactQrRow ? "flex-end" : "stretch",
							justifyContent: useCompactQrRow ? "space-between" : "flex-start",
							gap: useCompactQrRow ? 10 : 8,
						}}
					>
						{descriptionText && (
							<div
								style={{
									flex: useCompactQrRow ? 1 : undefined,
									minWidth: 0,
									padding: "10px 12px",
									borderRadius: 8,
									background: hexToRgba(colors.background, 0.7),
									border: `1px solid ${hexToRgba(colors.border, 0.75)}`,
									fontSize: descFs,
									color: colors.text,
									lineHeight: 1.4,
									whiteSpace: "pre-line",
								}}
							>
								{descriptionText}
							</div>
						)}
						{(customization.showQR || showMapsQr) && (
							<div
								style={{
									flexShrink: 0,
									display: "flex",
									flexDirection: "column",
									flexWrap: "nowrap",
									justifyContent: "flex-end",
									alignItems: "center",
									gap: bothQrs ? 18 : 12,
								}}
							>
								{customization.showQR && (
									<JobFlyerQrPanel
										label="Scan & Share CV"
										url={whatsAppUrl}
										emptyHint="Add WhatsApp number above"
										qrSize={mapQrSize}
										smallFs={smallFs}
										colors={colors}
									/>
								)}
								{showMapsQr && (
									<JobFlyerQrPanel
										label="Find us on Maps"
										url={mapsTarget}
										emptyHint="Add location or Maps link"
										qrSize={mapQrSize}
										smallFs={smallFs}
										colors={colors}
									/>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
