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

function descriptionFontSize(text: string, smallFs: number, compact: boolean): number {
	const len = text.length;
	const base = Math.max(6, Math.round(smallFs * (compact ? 0.86 : 0.9)));
	if (len > 1400) return Math.max(5, base - 2);
	if (len > 900) return Math.max(5, base - 1);
	return base;
}

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
				gap: 10,
				padding: "10px 12px",
				borderRadius: 10,
				background: hexToRgba(colors.background, 0.92),
				border: `1px solid ${hexToRgba(colors.border, 0.85)}`,
				boxShadow: `0 2px 8px ${hexToRgba(colors.primary, 0.06)}`,
			}}
		>
			<div
				style={{
					width: Math.round(labelFs * 2.2),
					height: Math.round(labelFs * 2.2),
					borderRadius: "50%",
					flexShrink: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: Math.round(labelFs * 1.15),
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
						letterSpacing: "0.06em",
						color: colors.textMuted,
						marginBottom: 2,
					}}
				>
					{item.label}
				</div>
				<div style={{ fontSize: valueFs, fontWeight: 700, color: colors.text, lineHeight: 1.25 }}>{item.value}</div>
			</div>
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
	const compact = widthPx < 420;
	const pad = Math.round(widthPx * (compact ? 0.055 : 0.065));
	const headingFs = Math.round(scaledHeadingFs(widthPx, customization) * (compact ? 0.82 : 1));
	const bodyFs = scaledBodyFs(widthPx, customization);
	const smallFs = Math.max(8, Math.round(bodyFs * 0.82));
	const bannerFs = Math.max(14, Math.round(widthPx * (compact ? 0.048 : 0.055)));
	const qrSize = Math.max(52, Math.round(widthPx * (compact ? 0.14 : 0.16)));
	const descriptionText = jobFlyer.jobDescription?.trim() ?? "";
	const descFs = descriptionText ? descriptionFontSize(descriptionText, smallFs, compact) : smallFs;
	const displayName = formatPrintDisplayName(branding.name, customization.typography.textTransform);
	const titleFont = titleFontFamily(customization);
	const titleExtras = titleStyleExtras(customization);

	const applyMessage = buildJobFlyerApplyMessage(jobFlyer, branding.name);
	const whatsAppUrl = branding.phone ? whatsAppChatUrl(branding.phone, applyMessage) : null;

	const details: DetailItem[] = [
		{ icon: "⏰", label: "Timings", value: jobFlyer.timings },
		{ icon: "💰", label: "Salary", value: jobFlyer.salary },
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
			{/* Header band */}
			<div
				style={{
					background: `linear-gradient(135deg, ${colors.primary} 0%, ${hexToRgba(colors.primary, 0.88)} 55%, ${colors.secondary} 100%)`,
					padding: `${Math.round(pad * 0.85)}px ${pad}px ${Math.round(pad * 0.65)}px`,
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
						letterSpacing: "0.14em",
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
						marginTop: 6,
						display: "inline-block",
						fontSize: smallFs,
						fontWeight: 700,
						letterSpacing: "0.08em",
						textTransform: "uppercase",
						color: colors.primary,
						background: colors.background,
						padding: "4px 12px",
						borderRadius: 999,
					}}
				>
					{EMPLOYMENT_LABELS[jobFlyer.employmentType]} position
				</div>
			</div>

			{/* Body */}
			<div
				style={{
					flex: 1,
					padding: pad,
					display: "flex",
					flexDirection: "column",
					gap: Math.round(pad * 0.55),
					minHeight: 0,
					overflow: "hidden",
				}}
			>
				<div style={{ textAlign: "center" }}>
					{customization.logoUrl && (
						<img
							src={customization.logoUrl}
							alt=""
							style={{
								height: Math.max(28, Math.round(widthPx * 0.08)),
								width: "auto",
								objectFit: "contain",
								margin: "0 auto 8px",
								display: "block",
							}}
						/>
					)}
					{displayName && (
						<p
							style={{
								margin: "0 0 6px",
								fontSize: bodyFs,
								fontWeight: 600,
								color: colors.textMuted,
								letterSpacing: "0.04em",
								textTransform: nameTransform,
							}}
						>
							{displayName}
						</p>
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
							letterSpacing: "0.02em",
							...titleExtras,
						}}
					>
						{jobFlyer.roleTitle.trim() || "Part time — Cloud Kitchen"}
					</h1>
					{jobFlyer.hookLine?.trim() && (
						<p
							style={{
								margin: "8px auto 0",
								maxWidth: "92%",
								fontSize: smallFs,
								fontWeight: 600,
								color: colors.accent,
								lineHeight: 1.35,
							}}
						>
							{jobFlyer.hookLine.trim()}
						</p>
					)}
					{branding.tagline && customization.showTagline && (
						<p style={{ margin: "6px 0 0", fontSize: smallFs, color: colors.textMuted, fontStyle: "italic" }}>
							{branding.tagline}
						</p>
					)}
				</div>

				<div
					style={{
						flexShrink: 0,
						display: "grid",
						gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
						gap: 8,
					}}
				>
					{details.map((item) => (
						<JobDetailCard key={item.label} item={item} labelFs={smallFs} valueFs={bodyFs} colors={colors} />
					))}
				</div>

				{descriptionText && (
					<div
						style={{
							flex: 1,
							minHeight: 0,
							overflow: "hidden",
							padding: "6px 8px",
							borderRadius: 8,
							background: hexToRgba(colors.background, 0.65),
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

				{jobFlyer.extraNotes?.trim() && (
					<div
						style={{
							padding: "8px 12px",
							borderRadius: 8,
							borderLeft: `4px solid ${colors.accent}`,
							background: hexToRgba(colors.accent, 0.1),
							fontSize: smallFs,
							color: colors.text,
							lineHeight: 1.35,
						}}
					>
						<strong style={{ color: colors.primary }}>Note: </strong>
						{jobFlyer.extraNotes.trim()}
					</div>
				)}

				{customization.showQR && (
					<div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto", paddingTop: Math.round(pad * 0.35) }}>
						{whatsAppUrl ? (
							<div
								style={{
									flexShrink: 0,
									textAlign: "center",
									padding: 6,
									borderRadius: 10,
									background: "#FFFFFF",
									border: `1px solid ${hexToRgba(colors.border, 0.85)}`,
									boxShadow: `0 4px 14px ${hexToRgba(colors.primary, 0.1)}`,
								}}
							>
								<p
									style={{
										margin: "0 0 4px",
										fontSize: Math.max(7, smallFs - 1),
										fontWeight: 700,
										color: colors.text,
										lineHeight: 1.2,
									}}
								>
									Scan & Share CV
								</p>
								<QRCodeSVG value={whatsAppUrl} size={qrSize} level="H" bgColor="#FFFFFF" fgColor="#111111" />
							</div>
						) : (
							<div
								style={{
									flexShrink: 0,
									width: qrSize + 12,
									padding: 8,
									borderRadius: 10,
									border: `2px dashed ${hexToRgba(colors.border, 0.85)}`,
									textAlign: "center",
									fontSize: Math.max(7, smallFs - 1),
									fontWeight: 600,
									color: colors.textMuted,
									lineHeight: 1.25,
								}}
							>
								Add WhatsApp number above
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
