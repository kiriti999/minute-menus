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

function descriptionFontSize(text: string, smallFs: number, tight: boolean): number {
	const len = text.length;
	let base = Math.max(5.5, Math.round(smallFs * (tight ? 0.7 : 0.88)));
	if (len > 1100) base -= 1;
	if (len > 1500) base -= 1;
	return Math.max(5, base);
}

function JobDetailCard({
	item,
	labelFs,
	valueFs,
	colors,
	dense,
}: {
	item: DetailItem;
	labelFs: number;
	valueFs: number;
	colors: DesignCustomization["colors"];
	dense: boolean;
}) {
	if (!item.value.trim()) return null;
	return (
		<div
			style={{
				display: "flex",
				alignItems: "flex-start",
				gap: dense ? 6 : 10,
				padding: dense ? "5px 7px" : "10px 12px",
				borderRadius: dense ? 7 : 10,
				background: hexToRgba(colors.background, 0.92),
				border: `1px solid ${hexToRgba(colors.border, 0.85)}`,
				boxShadow: dense ? "none" : `0 2px 8px ${hexToRgba(colors.primary, 0.06)}`,
			}}
		>
			<div
				style={{
					width: Math.round(labelFs * (dense ? 1.9 : 2.2)),
					height: Math.round(labelFs * (dense ? 1.9 : 2.2)),
					borderRadius: "50%",
					flexShrink: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: Math.round(labelFs * (dense ? 1 : 1.15)),
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
						marginBottom: 1,
					}}
				>
					{item.label}
				</div>
				<div style={{ fontSize: valueFs, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{item.value}</div>
			</div>
		</div>
	);
}

function JobFlyerQrPanel({
	show,
	whatsAppUrl,
	qrSize,
	smallFs,
	colors,
}: {
	show: boolean;
	whatsAppUrl: string | null;
	qrSize: number;
	smallFs: number;
	colors: DesignCustomization["colors"];
}) {
	if (!show) return null;
	const labelFs = Math.max(6, smallFs - 1);
	if (whatsAppUrl) {
		return (
			<div
				style={{
					flexShrink: 0,
					textAlign: "center",
					padding: 4,
					borderRadius: 8,
					background: "#FFFFFF",
					border: `1px solid ${hexToRgba(colors.border, 0.85)}`,
					boxShadow: `0 2px 10px ${hexToRgba(colors.primary, 0.08)}`,
				}}
			>
				<p style={{ margin: "0 0 3px", fontSize: labelFs, fontWeight: 700, color: colors.text, lineHeight: 1.15 }}>
					Scan & Share CV
				</p>
				<QRCodeSVG value={whatsAppUrl} size={qrSize} level="H" bgColor="#FFFFFF" fgColor="#111111" />
			</div>
		);
	}
	return (
		<div
			style={{
				flexShrink: 0,
				width: qrSize + 10,
				padding: 6,
				borderRadius: 8,
				border: `2px dashed ${hexToRgba(colors.border, 0.85)}`,
				textAlign: "center",
				fontSize: labelFs,
				fontWeight: 600,
				color: colors.textMuted,
				lineHeight: 1.2,
			}}
		>
			Add WhatsApp number above
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
	const tight = heightPx <= 860;
	const dense = compact || tight;
	const pad = Math.round(widthPx * (compact ? 0.048 : tight ? 0.042 : 0.065));
	const headingFs = Math.round(scaledHeadingFs(widthPx, customization) * (dense ? 0.68 : 1));
	const bodyFs = Math.max(8, scaledBodyFs(widthPx, customization) - (dense ? 1 : 0));
	const smallFs = Math.max(7, Math.round(bodyFs * (dense ? 0.78 : 0.82)));
	const bannerFs = Math.max(12, Math.round(widthPx * (dense ? 0.038 : 0.055)));
	const qrSize = Math.max(46, Math.round(widthPx * (dense ? 0.105 : 0.14)));
	const descriptionText = jobFlyer.jobDescription?.trim() ?? "";
	const descFs = descriptionText ? descriptionFontSize(descriptionText, smallFs, tight) : smallFs;
	const displayName = formatPrintDisplayName(branding.name, customization.typography.textTransform);
	const titleFont = titleFontFamily(customization);
	const titleExtras = titleStyleExtras(customization);
	const sectionGap = dense ? 4 : Math.round(pad * 0.55);

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
			<div
				style={{
					flexShrink: 0,
					background: `linear-gradient(135deg, ${colors.primary} 0%, ${hexToRgba(colors.primary, 0.88)} 55%, ${colors.secondary} 100%)`,
					padding: `${Math.round(pad * (dense ? 0.55 : 0.85))}px ${pad}px ${Math.round(pad * (dense ? 0.45 : 0.65))}px`,
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
						marginTop: dense ? 3 : 6,
						display: "inline-block",
						fontSize: Math.max(6, smallFs - 1),
						fontWeight: 700,
						letterSpacing: "0.06em",
						textTransform: "uppercase",
						color: colors.primary,
						background: colors.background,
						padding: dense ? "2px 8px" : "4px 12px",
						borderRadius: 999,
					}}
				>
					{EMPLOYMENT_LABELS[jobFlyer.employmentType]} position
				</div>
			</div>

			<div
				style={{
					flex: 1,
					padding: pad,
					display: "flex",
					flexDirection: "column",
					gap: sectionGap,
					minHeight: 0,
				}}
			>
				<div style={{ flexShrink: 0, textAlign: "center" }}>
					{customization.logoUrl && !dense && (
						<img
							src={customization.logoUrl}
							alt=""
							style={{
								height: Math.max(24, Math.round(widthPx * 0.07)),
								width: "auto",
								objectFit: "contain",
								margin: "0 auto 6px",
								display: "block",
							}}
						/>
					)}
					{displayName && !dense && (
						<p
							style={{
								margin: "0 0 4px",
								fontSize: smallFs,
								fontWeight: 600,
								color: colors.textMuted,
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
							lineHeight: 1.02,
							textTransform: nameTransform,
							...titleExtras,
						}}
					>
						{jobFlyer.roleTitle.trim() || "Part time — Cloud Kitchen"}
					</h1>
					{jobFlyer.hookLine?.trim() && (
						<p
							style={{
								margin: dense ? "4px auto 0" : "6px auto 0",
								maxWidth: "96%",
								fontSize: Math.max(6, smallFs - (dense ? 1 : 0)),
								fontWeight: 600,
								color: colors.accent,
								lineHeight: 1.25,
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
						gridTemplateColumns: dense ? "repeat(3, minmax(0, 1fr))" : compact ? "1fr" : "1fr 1fr",
						gap: dense ? 4 : 8,
					}}
				>
					{details.map((item) => (
						<JobDetailCard
							key={item.label}
							item={item}
							labelFs={Math.max(6, smallFs - 1)}
							valueFs={smallFs}
							colors={colors}
							dense={dense}
						/>
					))}
				</div>

				<div style={{ flexShrink: 0, marginTop: "auto", display: "flex", flexDirection: "column", gap: dense ? 3 : 5 }}>
					{jobFlyer.extraNotes?.trim() && (
						<div
							style={{
								padding: dense ? "4px 8px" : "6px 10px",
								borderRadius: 6,
								borderLeft: `3px solid ${colors.accent}`,
								background: hexToRgba(colors.accent, 0.1),
								fontSize: Math.max(6, smallFs - 1),
								color: colors.text,
								lineHeight: 1.25,
							}}
						>
							<strong style={{ color: colors.primary }}>Note: </strong>
							{jobFlyer.extraNotes.trim()}
						</div>
					)}

					<div style={{ display: "flex", alignItems: "flex-end", gap: dense ? 5 : 8 }}>
						{descriptionText && (
							<div
								style={{
									flex: 1,
									minWidth: 0,
									padding: dense ? "4px 6px" : "6px 8px",
									borderRadius: 6,
									background: hexToRgba(colors.background, 0.65),
									border: `1px solid ${hexToRgba(colors.border, 0.75)}`,
									fontSize: descFs,
									color: colors.text,
									lineHeight: 1.26,
									whiteSpace: "pre-line",
								}}
							>
								{descriptionText}
							</div>
						)}
						<JobFlyerQrPanel
							show={customization.showQR}
							whatsAppUrl={whatsAppUrl}
							qrSize={qrSize}
							smallFs={smallFs}
							colors={colors}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
