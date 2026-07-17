/**
 * Preview-only branding overlay for Image Editor.
 * Must never be drawn into the canvas export — download/apply use renderCroppedImage.
 */
import type React from "react";

export const PreviewWatermark: React.FC = () => (
  <div
    aria-hidden
    data-image-editor-watermark
    className="absolute inset-0 pointer-events-none overflow-hidden select-none"
  >
    <div
      className="absolute left-1/2 top-1/2 w-[220%] flex flex-wrap gap-x-10 gap-y-14 justify-center opacity-[0.14]"
      style={{ transform: "translate(-50%, -50%) rotate(-32deg)" }}
    >
      {Array.from({ length: 24 }, (_, i) => (
        <span
          key={i}
          className="text-white text-sm font-semibold tracking-widest uppercase whitespace-nowrap"
        >
          minute-menus
        </span>
      ))}
    </div>
  </div>
);
