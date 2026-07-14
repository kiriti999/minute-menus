/**
 * Hiring pamphlet layout — part-time / full-time job flyers.
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
import {
	baseBackground,
	containerRadius,
	effectiveFonts,
	footerQrSize,
	scaledBodyFs,
	scaledHeadingFs,
	titleFontFamily,
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

function DetailRow({
	label,
	value,
	labelFs,
	valueFs,
	mutedColor,
	borderColor,
}: {
	label: string;
	value: string;
	labelFs: number;
	valueFs: number;
	mutedColor: string;
	borderColor: string;
}) {
	if (!value.trim()) return null;
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				gap: 12,
				padding: "8px 0",
				borderBottom: `1px solid ${borderColor}`,
			}}
		>
			<span style={{ fontSize: labelFs, fontWeight: 600, color: mutedColor, flexShrink: 0 }}>{label}</span>
			<span style={{ fontSize: valueFs, fontWeight: 600, textAlign: "right" }}>{value}</span>
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
	siteUrl,
}) => {
	const { colors } = customization;
	const fonts = effectiveFonts(customization);
	const pad = Math.round(widthPx * 0.07);
	const headingFs = scaledHeadingFs(widthPx, customization);
	const bodyFs = scaledBodyFs(widthPx, customization);
	const smallFs = Math.max(8, Math.round(bodyFs * 0.88));
	const qrSize = footerQrSize(widthPx);

	return (
		<div
			style={{
				width: widthPx,
				height: heightPx,
				boxSizing: "border-box",
				padding: pad,
				display: "flex",
				flexDirection: "column",
				fontFamily: fonts.body,
				color: colors.text,
				background: baseBackground(customization),
			}}
		>
			<div style={{ textAlign: "center", marginBottom: Math.round(pad * 0.6) }}>
				<span
					style={{
						display: "inline-block",
						fontSize: smallFs,
						fontWeight: 700,
						letterSpacing: "0.12em",
						textTransform: "uppercase",
						color: colors.background,
						background: colors.primary,
						padding: "6px 14px",
						borderRadius: 999,
					}}
				>
					We&apos;re hiring · {EMPLOYMENT_LABELS[jobFlyer.employmentType]}
				</span>
			</div>

			<h1
				style={{
					margin: 0,
					textAlign: "center",
					fontSize: headingFs,
					fontFamily: titleFontFamily(customization),
					fontWeight: 700,
					color: colors.primary,
					lineHeight: 1.1,
				}}
			>
				{jobFlyer.roleTitle.trim() || "Team Member"}
			</h1>

			{branding.name && (
				<p
					style={{
						margin: `${Math.round(pad * 0.25)}px 0 0`,
						textAlign: "center",
						fontSize: bodyFs,
						fontWeight: 600,
						color: colors.textMuted,
					}}
				>
					{branding.name}
				</p>
			)}

			<div
				style={{
					marginTop: pad,
					flex: 1,
					background: `${colors.background}cc`,
					borderRadius: containerRadius(customization),
					border: `2px solid ${colors.border}`,
					padding: Math.round(pad * 0.75),
				}}
			>
				<p
					style={{
						margin: "0 0 8px",
						fontSize: smallFs,
						fontWeight: 700,
						textTransform: "uppercase",
						letterSpacing: "0.08em",
						color: colors.secondary,
					}}
				>
					Job details
				</p>
				<DetailRow label="Timings" value={jobFlyer.timings} labelFs={smallFs} valueFs={bodyFs} mutedColor={colors.textMuted} borderColor={colors.border} />
				<DetailRow label="Salary" value={jobFlyer.salary} labelFs={smallFs} valueFs={bodyFs} mutedColor={colors.textMuted} borderColor={colors.border} />
				<DetailRow label="Min. age" value={jobFlyer.minAge} labelFs={smallFs} valueFs={bodyFs} mutedColor={colors.textMuted} borderColor={colors.border} />
				<DetailRow label="Qualification" value={jobFlyer.qualification} labelFs={smallFs} valueFs={bodyFs} mutedColor={colors.textMuted} borderColor={colors.border} />
				<DetailRow
					label="English"
					value={ENGLISH_LABELS[jobFlyer.englishSkill]}
					labelFs={smallFs}
					valueFs={bodyFs}
					mutedColor={colors.textMuted}
					borderColor={colors.border}
				/>
				{jobFlyer.extraNotes?.trim() && (
					<p style={{ margin: "10px 0 0", fontSize: smallFs, color: colors.textMuted, lineHeight: 1.4 }}>
						{jobFlyer.extraNotes.trim()}
					</p>
				)}
			</div>

			<div
				style={{
					marginTop: pad,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: pad,
				}}
			>
				<div style={{ flex: 1, minWidth: 0 }}>
					<p style={{ margin: 0, fontSize: smallFs, fontWeight: 700, textTransform: "uppercase", color: colors.secondary }}>
						Apply now
					</p>
					{branding.phone && (
						<p style={{ margin: "4px 0 0", fontSize: bodyFs, fontWeight: 700 }}>{branding.phone}</p>
					)}
					{branding.address && (
						<p style={{ margin: "4px 0 0", fontSize: smallFs, color: colors.textMuted, lineHeight: 1.35 }}>
							{branding.address}
						</p>
					)}
				</div>
				{customization.showQR && siteUrl && (
					<div style={{ flexShrink: 0, textAlign: "center" }}>
						<QRCodeSVG value={siteUrl} size={qrSize} level="H" bgColor={colors.background} fgColor={colors.text} />
						<p style={{ margin: "4px 0 0", fontSize: Math.max(7, smallFs - 2), color: colors.textMuted }}>Scan menu</p>
					</div>
				)}
			</div>
		</div>
	);
};
