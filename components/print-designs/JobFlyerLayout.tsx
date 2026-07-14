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

function descriptionFontSize(text: string, smallFs: number, pamphlet: boolean): number {
	const len = text.length;
	let fs = Math.max(9, Math.round(smallFs * (pamphlet ? 1.08 : 0.98)));
	if (len > 1200) fs -= 1;
	if (len > 1600) fs -= 1;
	return Math.max(8, fs);
}

/** A5 job flyers need slightly larger type than menu pamphlets. */
function jobFlyerTypeScale(widthPx: number, heightPx: number, pamphlet: boolean): number {
	if (!pamphlet) return 1;
	const area = widthPx * heightPx;
	if (area < 500_000) return 1.28;
	if (area < 650_000) return 1.18;
	return 1.1;
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
				gap: 8,
				padding: "10px 12px",
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
	const labelFs = Math.max(8, Math.round(smallFs * 0.92));
	if (whatsAppUrl) {
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
					Scan & Share CV
				</p>
				<QRCodeCanvas value={whatsAppUrl} size={qrSize} level="H" bgColor="#FFFFFF" fgColor="#111111" />
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
	const pamphlet = heightPx <= 860;
	const typeScale = jobFlyerTypeScale(widthPx, heightPx, pamphlet);
	const pad = Math.round(widthPx * (pamphlet ? 0.052 : 0.06));
	const headingFs = Math.round(scaledHeadingFs(widthPx, customization) * (pamphlet ? 0.96 : 1) * typeScale);
	const bodyFs = Math.round(scaledBodyFs(widthPx, customization) * typeScale);
	const smallFs = Math.max(10, Math.round(bodyFs * 0.94));
	const bannerFs = Math.max(15, Math.round(widthPx * 0.052 * (pamphlet ? 1.05 : 1)));
	const qrSize = Math.max(62, Math.round(widthPx * (pamphlet ? 0.155 : 0.13)));
	const descriptionText = jobFlyer.jobDescription?.trim() ?? "";
	const descFs = descriptionText ? descriptionFontSize(descriptionText, smallFs, pamphlet) : smallFs;
	const displayName = formatPrintDisplayName(branding.name, customization.typography.textTransform);
	const titleFont = titleFontFamily(customization);
	const titleExtras = titleStyleExtras(customization);
	const gap = pamphlet ? 10 : Math.round(pad * 0.5);
	const detailCols = widthPx < 400 ? 1 : 2;
	const detailLabelFs = Math.max(8, Math.round(smallFs * 0.88));
	const detailValueFs = Math.max(10, smallFs);

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
					{displayName && (
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
								margin: "8px auto 0",
								maxWidth: "94%",
								fontSize: Math.round(smallFs * 1.02),
								fontWeight: 600,
								color: colors.accent,
								lineHeight: 1.38,
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
							fontSize: Math.max(9, Math.round(smallFs * 0.96)),
							color: colors.text,
							lineHeight: 1.42,
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
							padding: "12px 14px",
							borderRadius: 8,
							background: hexToRgba(colors.background, 0.7),
							border: `1px solid ${hexToRgba(colors.border, 0.75)}`,
							fontSize: descFs,
							color: colors.text,
							lineHeight: 1.48,
							whiteSpace: "pre-line",
						}}
					>
						{descriptionText}
					</div>
				)}

				<div style={{ flexShrink: 0, display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
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
	);
};
