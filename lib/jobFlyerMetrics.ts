/** Job flyer typography — sized in print points so A5 PNG/PDF stay readable at any DPI. */

export type JobFlyerSizing = {
	typeScale: number;
	pad: number;
	gap: number;
	headingFs: number;
	smallFs: number;
	descFs: number;
	bannerFs: number;
	qrSize: number;
	detailLabelFs: number;
	detailValueFs: number;
	useCompactQrRow: boolean;
	detailGap: number;
	headerPadY: number;
};

type SizingInput = {
	widthPx: number;
	heightPx: number;
	pamphlet: boolean;
	descriptionText: string;
	hasNotes: boolean;
	showQr: boolean;
	detailCount: number;
	baseHeadingFs: number;
	baseBodyFs: number;
};

/** Infer CSS px per inch from layout size (A5 width 148mm when pamphlet-shaped). */
function layoutDpi(widthPx: number, pamphlet: boolean): number {
	const widthMm = pamphlet ? 148 : Math.max(100, (widthPx / 96) * 25.4);
	return Math.max(96, Math.round(widthPx / (widthMm / 25.4)));
}

function pt(points: number, dpi: number): number {
	return Math.max(1, Math.round((points * dpi) / 72));
}

/** Portrait flyer (A5/A4/A6) — do not use a fixed px height cutoff (breaks at 300 DPI). */
export function isJobFlyerPamphlet(widthPx: number, heightPx: number): boolean {
	const aspect = heightPx / Math.max(1, widthPx);
	return aspect >= 1.25 && aspect <= 1.6;
}

function estimateDescLines(text: string, charsPerLine: number): number {
	if (!text) return 0;
	let lines = 0;
	for (const para of text.split("\n")) {
		const len = para.trim().length;
		lines += len === 0 ? 0.55 : Math.max(1, Math.ceil(len / charsPerLine));
	}
	return lines;
}

function estimateChromeHeight(input: {
	dpi: number;
	pad: number;
	gap: number;
	headingFs: number;
	bannerFs: number;
	smallFs: number;
	detailValueFs: number;
	qrSize: number;
	detailCols: number;
	detailCount: number;
	hasNotes: boolean;
	hasDescription: boolean;
	showQr: boolean;
}): number {
	const headerH = input.bannerFs * 1.35 + input.smallFs + Math.round(input.pad * 1.25);
	const titleH = input.headingFs * 1.15 + input.smallFs * 1.5 + 20;
	const rows = Math.ceil(Math.max(1, input.detailCount) / input.detailCols);
	const detailRowH = input.detailValueFs * 2.8 + 16;
	const detailsH = rows * detailRowH + (rows - 1) * 8;
	const notesH = input.hasNotes ? input.smallFs * 2.4 + 20 : 0;
	const waH = input.smallFs * 1.4 + 20;
	const qrBlockH = input.showQr
		? input.qrSize + Math.max(22, Math.round(input.smallFs * 1.6)) + 16
		: 0;
	const descChrome = input.hasDescription ? 20 : 0;
	const gaps = input.gap * (3 + (input.hasNotes ? 1 : 0) + (input.hasDescription ? 1 : 0) + (input.showQr ? 1 : 0));
	return headerH + input.pad * 2 + titleH + detailsH + notesH + waH + qrBlockH + descChrome + gaps;
}

export function computeJobFlyerSizing(input: SizingInput): JobFlyerSizing {
	const dpi = layoutDpi(input.widthPx, input.pamphlet);
	const detailCols = input.widthPx < 400 ? 1 : 2;
	const descLen = input.descriptionText.length;
	const hasDescription = descLen > 0;

	let padScale = input.pamphlet ? 0.048 : 0.06;
	let gapPt = input.pamphlet ? 4 : 5;
	let headingPt = input.pamphlet ? 16 : 20;
	let bannerPt = input.pamphlet ? 18 : 22;
	let smallPt = input.pamphlet ? 8.5 : 9.5;
	let detailLabelPt = 7.5;
	let detailValuePt = input.pamphlet ? 8.5 : 9.5;
	let descPt = input.pamphlet ? 9.5 : 10.5;
	let qrMm = input.pamphlet ? 18 : 28;
	let compact = false;

	if (descLen > 900) descPt -= 0.5;
	if (descLen > 1300) descPt -= 0.5;

	for (let step = 0; step < 8; step++) {
		const pad = Math.round(input.widthPx * padScale);
		const gap = Math.max(pt(gapPt, dpi), Math.round(pad * 0.28));
		const headingFs = pt(headingPt, dpi);
		const bannerFs = pt(bannerPt, dpi);
		const smallFs = pt(smallPt, dpi);
		const detailLabelFs = pt(detailLabelPt, dpi);
		const detailValueFs = pt(detailValuePt, dpi);
		const descFs = pt(descPt, dpi);
		const qrSize = Math.min(
			Math.round(input.widthPx * (compact ? 0.2 : 0.24)),
			Math.max(pt(compact ? 48 : 56, dpi), Math.round((qrMm / 25.4) * dpi)),
		);
		const charsPerLine = Math.max(28, Math.floor((input.widthPx - pad * 2) / (descFs * 0.52)));
		const descLines = estimateDescLines(input.descriptionText, charsPerLine);
		const descH = hasDescription ? descLines * descFs * 1.34 + descFs * 1.4 : 0;
		const chrome = estimateChromeHeight({
			dpi,
			pad,
			gap,
			headingFs,
			bannerFs,
			smallFs,
			detailValueFs,
			qrSize,
			detailCols,
			detailCount: input.detailCount,
			hasNotes: input.hasNotes,
			hasDescription,
			showQr: input.showQr,
		});
		if (chrome + descH <= input.heightPx * 0.98) {
			return {
				typeScale: dpi / 96,
				pad,
				gap,
				headingFs,
				smallFs,
				descFs,
				bannerFs,
				qrSize,
				detailLabelFs,
				detailValueFs,
				useCompactQrRow: compact,
				detailGap: compact ? 6 : 8,
				headerPadY: Math.round(pad * (compact ? 0.55 : 0.65)),
			};
		}
		// Tighten until copy + QRs fit the page.
		if (qrMm > 14) qrMm -= 1.5;
		else compact = true;
		if (descPt > 8) descPt -= 0.35;
		if (gapPt > 3) gapPt -= 0.35;
		if (padScale > 0.038) padScale -= 0.003;
		if (headingPt > 13) headingPt -= 0.4;
		if (bannerPt > 14) bannerPt -= 0.4;
		if (detailValuePt > 7.5) detailValuePt -= 0.25;
		if (smallPt > 7.5) smallPt -= 0.25;
	}

	const pad = Math.round(input.widthPx * padScale);
	const gap = Math.max(pt(gapPt, dpi), Math.round(pad * 0.28));
	return {
		typeScale: dpi / 96,
		pad,
		gap,
		headingFs: pt(headingPt, dpi),
		smallFs: pt(smallPt, dpi),
		descFs: pt(descPt, dpi),
		bannerFs: pt(bannerPt, dpi),
		qrSize: Math.min(
			Math.round(input.widthPx * 0.18),
			Math.max(pt(44, dpi), Math.round((14 / 25.4) * dpi)),
		),
		detailLabelFs: pt(detailLabelPt, dpi),
		detailValueFs: pt(detailValuePt, dpi),
		useCompactQrRow: true,
		detailGap: 6,
		headerPadY: Math.round(pad * 0.5),
	};
}
