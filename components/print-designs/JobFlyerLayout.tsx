/**
 * Hiring pamphlet — bold "We Are Hiring" layout for print / PDF export.
 */
import type {
	DesignCustomization,
	EnglishSkillLevel,
	JobFlyerContent,
	JobEmploymentType,
	RestaurantBranding,
} from "@minute-menus/types";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";
import { whatsAppChatUrl } from "../../lib/whatsappLink";
import {
	effectiveFonts,
	formatPrintDisplayName,
	hexToRgba,
	scaledBodyFs,
	scaledHeadingFs,
	titleFontFamily,
	titleStyleExtras,
} from "./menuStyleHelpers";

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
	customization: DesignCustomization;
	branding: RestaurantBranding;
	jobFlyer: JobFlyerContent;
	widthPx: number;
	heightPx: number;
	siteUrl: string;
}

export const JobFlyerLayout: React.FC<JobFlyerLayoutProps> = ({
	customization,
	branding,
	jobFlyer,
	widthPx,
	heightPx,
	siteUrl: _siteUrl,
}) => {
	const { colors } = customization;
	const fonts = effectiveFonts(customization);
	const compact = widthPx < 420;
	const pad = Math.round(widthPx * (compact ? 0.055 : 0.065));
	const headingFs = Math.round(scaledHeadingFs(widthPx, customization) * (compact ? 0.82 : 1));
	const bodyFs = scaledBodyFs(widthPx, customization);
	const smallFs = Math.max(8, Math.round(bodyFs * 0.82));
	const bannerFs = Math.max(14, Math.round(widthPx * (compact ? 0.048 : 0.055)));
	const qrSize = Math.max(52, Math.round(widthPx * (compact ? 0.14 : 0.16)));
	const displayName = formatPrintDisplayName(branding.name, customization.typography.textTransform);
	const titleFont = titleFontFamily(customization);
	const titleExtras = titleStyleExtras(customization);

	const applyMessage = `Hi, I'm interested in the ${jobFlyer.roleTitle.trim() || "open"} (${EMPLOYMENT_LABELS[jobFlyer.employmentType]}) role at ${branding.name || "your restaurant"}.`;
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
				background: colors.background,
				overflow: "hidden",
				position: "relative",
			}}
		>
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
						fontWeight: 900,
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
								textTransform: "uppercase",
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
							fontWeight: 800,
							color: colors.primary,
							lineHeight: 1.05,
							textTransform: "uppercase",
							letterSpacing: "0.02em",
							...titleExtras,
						}}
					>
						{jobFlyer.roleTitle.trim() || "Team Member"}
					</h1>
					{branding.tagline && customization.showTagline && (
						<p style={{ margin: "6px 0 0", fontSize: smallFs, color: colors.textMuted, fontStyle: "italic" }}>
							{branding.tagline}
						</p>
					)}
				</div>

				<div
					style={{
						flex: 1,
						display: "grid",
						gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
						gap: 8,
						alignContent: "start",
					}}
				>
					{details.map((item) => (
						<JobDetailCard key={item.label} item={item} labelFs={smallFs} valueFs={bodyFs} colors={colors} />
					))}
				</div>

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
			</div>

			{/* Footer CTA */}
			<div
				style={{
					background: colors.primary,
					color: colors.background,
					padding: `${Math.round(pad * 0.75)}px ${pad}px`,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: pad,
				}}
			>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontSize: Math.round(bodyFs * 1.05),
							fontWeight: 900,
							letterSpacing: "0.1em",
							textTransform: "uppercase",
							fontFamily: titleFont,
						}}
					>
						Apply Now
					</div>
					{branding.phone && (
						<p style={{ margin: "4px 0 0", fontSize: bodyFs, fontWeight: 700 }}>{branding.phone}</p>
					)}
					{branding.address && (
						<p style={{ margin: "3px 0 0", fontSize: smallFs, opacity: 0.88, lineHeight: 1.3 }}>{branding.address}</p>
					)}
				</div>
				{customization.showQR && whatsAppUrl && (
					<div
						style={{
							flexShrink: 0,
							textAlign: "center",
							padding: 6,
							borderRadius: 10,
							background: "#FFFFFF",
							boxShadow: `0 4px 14px ${hexToRgba("#000", 0.15)}`,
						}}
					>
						<p
							style={{
								margin: "0 0 4px",
								fontSize: Math.max(7, smallFs - 1),
								fontWeight: 700,
								color: "#111111",
								lineHeight: 1.2,
							}}
						>
							Scan & Share resume
						</p>
						<QRCodeSVG value={whatsAppUrl} size={qrSize} level="H" bgColor="#FFFFFF" fgColor="#111111" />
					</div>
				)}
			</div>
		</div>
	);
};
