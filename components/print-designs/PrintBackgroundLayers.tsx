import type { DesignCustomization } from "@minute-menus/types";
import type React from "react";
import { patternInkColor, patternOverlay } from "./menuStyleHelpers";

export function PrintBackgroundLayers({
	customization,
}: {
	customization: DesignCustomization;
}): React.ReactElement | null {
	const showPattern = customization.backgroundType === "pattern" && customization.backgroundPattern;
	const showImage = customization.backgroundType === "image" && customization.backgroundImageUrl;
	if (!showPattern && !showImage) return null;

	return (
		<>
			{showPattern && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						...patternOverlay(customization.backgroundPattern!, patternInkColor(customization)),
						pointerEvents: "none",
					}}
				/>
			)}
			{showImage && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						backgroundImage: `url(${customization.backgroundImageUrl})`,
						backgroundSize: "cover",
						backgroundPosition: "center",
						opacity: 0.18,
						pointerEvents: "none",
					}}
				/>
			)}
		</>
	);
}
