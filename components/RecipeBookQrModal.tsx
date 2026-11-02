import { Download, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type React from "react";
import { useRef } from "react";

export interface RecipeBookQrModalProps {
	url: string;
	restaurantName: string;
	isDarkTheme: boolean;
	onClose: () => void;
}

const POSTER = 1100;
const PNG_SCALE = 2;

function saveBlob(blob: Blob, filename: string) {
	const href = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = href;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(href);
}

const serialize = (svg: SVGSVGElement): string =>
	new XMLSerializer().serializeToString(svg);

/** Rasterises the poster SVG onto a canvas; rejects if the browser cannot decode it. */
function toPngBlob(svg: SVGSVGElement): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		const svgUrl = URL.createObjectURL(
			new Blob([serialize(svg)], { type: "image/svg+xml" }),
		);
		image.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = canvas.height = POSTER * PNG_SCALE;
			canvas
				.getContext("2d")
				?.drawImage(image, 0, 0, canvas.width, canvas.height);
			URL.revokeObjectURL(svgUrl);
			canvas.toBlob(
				(blob) =>
					blob ? resolve(blob) : reject(new Error("Could not create the PNG")),
				"image/png",
			);
		};
		image.onerror = () => reject(new Error("Could not render the QR code"));
		image.src = svgUrl;
	});
}

/** Printable QR poster for the recipe book page, downloadable as SVG or PNG. */
export const RecipeBookQrModal: React.FC<RecipeBookQrModalProps> = ({
	url,
	restaurantName,
	isDarkTheme,
	onClose,
}) => {
	const posterRef = useRef<SVGSVGElement>(null);
	const filename = "recipe-book-qr";
	const card = isDarkTheme
		? "bg-zinc-900 border-zinc-800 text-white"
		: "bg-white border-zinc-200 text-zinc-900";
	const button = `inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`;

	const downloadSvg = () => {
		if (posterRef.current)
			saveBlob(
				new Blob([serialize(posterRef.current)], { type: "image/svg+xml" }),
				`${filename}.svg`,
			);
	};
	const downloadPng = () => {
		if (!posterRef.current) return;
		toPngBlob(posterRef.current).then(
			(blob) => saveBlob(blob, `${filename}.png`),
			() => undefined,
		);
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
			role="dialog"
			aria-modal="true"
		>
			<div
				className={`w-full max-w-md space-y-4 rounded-2xl border p-5 ${card}`}
			>
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-bold">Recipe book QR code</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="opacity-60 hover:opacity-100"
					>
						<X size={18} />
					</button>
				</div>
				<svg
					ref={posterRef}
					xmlns="http://www.w3.org/2000/svg"
					viewBox={`0 0 ${POSTER} ${POSTER}`}
					width={POSTER}
					height={POSTER}
					className="w-full h-auto rounded-xl"
					fontFamily="Helvetica, Arial, sans-serif"
				>
					<title>Recipe book QR code</title>
					<rect width={POSTER} height={POSTER} fill="#fff" />
					<text
						x={POSTER / 2}
						y="110"
						fontSize="64"
						fontWeight="700"
						textAnchor="middle"
						fill="#000"
					>
						Recipe Book
					</text>
					<text
						x={POSTER / 2}
						y="165"
						fontSize="32"
						textAnchor="middle"
						fill="#555"
					>
						{restaurantName} · team only
					</text>
					<QRCodeSVG
						value={url}
						size={800}
						level="H"
						marginSize={4}
						x={150}
						y={230}
					/>
					<text
						x={POSTER / 2}
						y="1070"
						fontSize="30"
						textAnchor="middle"
						fill="#555"
					>
						Scan, enter your team email, then the emailed code
					</text>
				</svg>
				<div className="flex flex-wrap gap-2">
					<button type="button" onClick={downloadPng} className={button}>
						<Download size={16} />
						PNG
					</button>
					<button type="button" onClick={downloadSvg} className={button}>
						<Download size={16} />
						SVG
					</button>
				</div>
			</div>
		</div>
	);
};
