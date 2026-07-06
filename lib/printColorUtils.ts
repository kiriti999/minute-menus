/**
 * Colour utilities for print export — CMYK conversion and print simulation.
 */
import type { ColorMode, DesignColors } from "@minute-menus/types";

export interface CmykValues {
  c: number;
  m: number;
  y: number;
  k: number;
}

export function hexToCmyk(hex: string): CmykValues {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 100 };
  const c = ((1 - r - k) / (1 - k)) * 100;
  const m = ((1 - g - k) / (1 - k)) * 100;
  const y = ((1 - b - k) / (1 - k)) * 100;
  return { c: Math.round(c), m: Math.round(m), y: Math.round(y), k: Math.round(k * 100) };
}

export function formatCmyk(v: CmykValues): string {
  return `C${v.c} M${v.m} Y${v.y} K${v.k}`;
}

/** Approximate CMYK print look on screen (browser exports remain RGB). */
export function cmykSimulationFilter(): string {
  return 'saturate(0.88) contrast(1.04) brightness(0.98)';
}

export function colorModeLabel(mode: ColorMode): string {
  return mode === 'cmyk' ? 'CMYK (Print)' : 'RGB (Digital)';
}

export function colorsToCmykSummary(colors: DesignColors): { label: string; cmyk: string }[] {
  const entries: { key: keyof DesignColors; label: string }[] = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'background', label: 'Background' },
    { key: 'text', label: 'Text' },
    { key: 'accent', label: 'Accent' },
  ];
  return entries.map(({ key, label }) => ({
    label,
    cmyk: formatCmyk(hexToCmyk(colors[key])),
  }));
}
