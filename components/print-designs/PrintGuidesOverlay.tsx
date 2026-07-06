/**
 * Bleed zone and crop-mark overlays for print preview and export.
 */
import type { FormatInfo } from "../../lib/printDesigns";

const mmToPx = (mm: number, widthPx: number, widthMm: number) =>
  Math.round(mm * widthPx / widthMm);

interface PrintGuidesOverlayProps {
  fmt: FormatInfo;
  widthPx: number;
  heightPx: number;
  showBleed: boolean;
  showCropMarks: boolean;
}

function CropMark({ x, y, rot }: { x: number; y: number; rot: number }) {
  const len = 12;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: len,
        height: 1,
        background: '#000',
        transform: `rotate(${rot}deg)`,
        transformOrigin: '0 0',
        pointerEvents: 'none',
      }}
    />
  );
}

export function PrintGuidesOverlay({ fmt, widthPx, heightPx, showBleed, showCropMarks }: PrintGuidesOverlayProps) {
  const bleed = mmToPx(fmt.bleedMm, widthPx, fmt.widthMm);
  const markOffset = 6;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {showBleed && bleed > 0 && (
        <div
          style={{
            position: 'absolute',
            top: bleed,
            left: bleed,
            right: bleed,
            bottom: bleed,
            border: '1px dashed rgba(255,80,80,0.7)',
            boxShadow: `0 0 0 ${bleed}px rgba(255,80,80,0.08)`,
          }}
        />
      )}
      {showCropMarks && (
        <>
          <CropMark x={markOffset} y={0} rot={0} />
          <CropMark x={0} y={markOffset} rot={90} />
          <CropMark x={widthPx - markOffset} y={0} rot={0} />
          <CropMark x={widthPx} y={markOffset} rot={90} />
          <CropMark x={markOffset} y={heightPx} rot={0} />
          <CropMark x={0} y={heightPx - markOffset} rot={90} />
          <CropMark x={widthPx - markOffset} y={heightPx} rot={0} />
          <CropMark x={widthPx} y={heightPx - markOffset} rot={90} />
        </>
      )}
    </div>
  );
}
