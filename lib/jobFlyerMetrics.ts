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

export function computeJobFlyerSizing(input: SizingInput): JobFlyerSizing {
	const dpi = layoutDpi(input.widthPx, input.pamphlet);
	const pad = Math.round(input.widthPx * (input.pamphlet ? 0.055 : 0.06));
	const gap = Math.max(pt(5, dpi), Math.round(pad * 0.35));

	// Target print sizes (pt) — readable on A5 paper.
	const headingFs = pt(input.pamphlet ? 18 : 20, dpi);
	const bannerFs = pt(input.pamphlet ? 20 : 22, dpi);
	const smallFs = pt(9.5, dpi);
	const detailLabelFs = pt(8, dpi);
	const detailValueFs = pt(9.5, dpi);
	let descFs = pt(10.5, dpi);
	const descLen = input.descriptionText.length;
	if (descLen > 1400) descFs = pt(10, dpi);
	if (descLen > 1800) descFs = pt(9.5, dpi);

	// ~28mm QR modules — scannable without eating the copy.
	const qrSize = Math.min(
		Math.round(input.widthPx * 0.28),
		Math.max(pt(72, dpi), Math.round((28 / 25.4) * dpi)),
	);

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
		useCompactQrRow: false,
	};
}
