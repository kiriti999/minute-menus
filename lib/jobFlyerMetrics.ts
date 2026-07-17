/** Job flyer typography — balanced for A5 fit without clipping. */

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

function baseTypeScale(widthPx: number, heightPx: number, pamphlet: boolean): number {
	if (!pamphlet) return 1;
	const area = widthPx * heightPx;
	if (area < 500_000) return 1.06;
	if (area < 650_000) return 1.04;
	return 1.02;
}

/** Rough vertical budget check — shrinks type when content would overflow A5. */
function contentFitScale(input: SizingInput, typeScale: number): number {
	if (!input.pamphlet) return 1;

	const pad = Math.round(input.widthPx * 0.05);
	const gap = 8;
	const headerH = pad * 1.3 + input.widthPx * 0.048;
	const titleBlock = 78 * typeScale;
	const detailRows = Math.ceil(input.detailCount / 2);
	const detailH = detailRows * 48 * typeScale;
	const noteH = input.hasNotes ? 34 * typeScale : 0;
	const descFs = Math.max(8, Math.round(input.baseBodyFs * typeScale * 0.96));
	const descLines = Math.max(8, Math.ceil(input.descriptionText.length / 48));
	const descH = input.descriptionText ? descLines * descFs * 1.35 + 20 : 0;
	// QRs sit below the description in a horizontal row.
	const qrBlock = input.showQr ? Math.round(input.widthPx * 0.22) + 48 : 0;
	const sectionGaps = gap * (3 + (input.hasNotes ? 1 : 0) + (input.descriptionText ? 1 : 0) + (input.showQr ? 1 : 0));
	const needed = headerH + pad * 2 + titleBlock + detailH + noteH + descH + qrBlock + sectionGaps;
	const available = input.heightPx - 4;

	if (needed <= available) return 1;
	return Math.max(0.8, available / needed);
}

export function computeJobFlyerSizing(input: SizingInput): JobFlyerSizing {
	const baseScale = baseTypeScale(input.widthPx, input.heightPx, input.pamphlet);
	const fitScale = contentFitScale(input, baseScale);
	const typeScale = baseScale * fitScale;
	const pad = Math.round(input.widthPx * (input.pamphlet ? 0.05 : 0.06));
	const bodyFs = Math.round(input.baseBodyFs * typeScale);
	const smallFs = Math.max(9, Math.round(bodyFs * 0.93));
	const descLen = input.descriptionText.length;
	let descFs = Math.max(10, Math.round(smallFs * (input.pamphlet ? 1.02 : 1)));
	if (descLen > 1200) descFs -= 1;
	if (descLen > 1500) descFs -= 1;

	// Phone cameras need ~100px+; size for two QRs side-by-side below the copy.
	const qrSize = Math.max(
		96,
		Math.round(input.widthPx * (input.pamphlet ? 0.18 : 0.17) * Math.min(1, typeScale + 0.02)),
	);

	return {
		typeScale,
		pad,
		gap: input.pamphlet ? Math.max(7, Math.round(8 * fitScale)) : Math.round(pad * 0.5),
		headingFs: Math.round(input.baseHeadingFs * (input.pamphlet ? 0.92 : 1) * typeScale),
		smallFs,
		descFs: Math.max(10, descFs),
		bannerFs: Math.max(14, Math.round(input.widthPx * 0.048 * typeScale)),
		qrSize,
		detailLabelFs: Math.max(7, Math.round(smallFs * 0.86)),
		detailValueFs: Math.max(9, smallFs),
		useCompactQrRow: false,
	};
}
