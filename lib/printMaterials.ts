/**
 * Material and finish recommendations by design type and format.
 */
import type { PrintDesignType, PrintFormat } from "@minute-menus/types";

export interface MaterialRecommendation {
  material: string;
  finish: string;
  quantity: string;
  costRange: string;
  notes: string;
}

const BY_TYPE: Record<PrintDesignType, MaterialRecommendation> = {
  'menu-card': {
    material: '300 GSM art card',
    finish: 'Matt lamination both sides',
    quantity: '100–250 sheets',
    costRange: '₹5–15 per print',
    notes: 'Fold optional for bi-fold menus. Ask printer for 3mm bleed.',
  },
  'wall-board': {
    material: '3mm PVC foam board or sunboard',
    finish: 'Matt UV print',
    quantity: '1–3 boards',
    costRange: '₹150–400 (A2)',
    notes: 'Mount with standoffs or adhesive strips. Indoor use recommended.',
  },
  'pamphlet': {
    material: '130–170 GSM gloss/matt paper',
    finish: 'Single or double-sided',
    quantity: '500–1000 flyers',
    costRange: '₹2–8 per print',
    notes: 'DL tri-fold is popular for takeaway inserts.',
  },
  'pocket-card': {
    material: '300 GSM art card',
    finish: 'Matt lamination',
    quantity: '250–500 cards',
    costRange: '₹1–3 per card',
    notes: 'Rounded corners optional. Keep QR at least 20mm for scan reliability.',
  },
  'sticker': {
    material: 'Vinyl sticker (white) or paper label',
    finish: 'Gloss or matt lamination',
    quantity: '100–500 stickers',
    costRange: '₹3–8 per sticker',
    notes: 'Circle stickers need die-cut. Use permanent adhesive for outdoor.',
  },
};

const FORMAT_OVERRIDES: Partial<Record<PrintFormat, Partial<MaterialRecommendation>>> = {
  'circle-50': { notes: 'Packaging / delivery box sticker. Min QR 15mm.', costRange: '₹2–5 per sticker' },
  'circle-75': { notes: 'Table sticker size. Good scan distance 30–50cm.', costRange: '₹3–6 per sticker' },
  'circle-100': { notes: 'Window or door sticker. High visibility.', costRange: '₹5–10 per sticker' },
  'square-50': { notes: 'Compact square label for containers.', costRange: '₹2–5 per sticker' },
  'square-75': { notes: 'Standard counter sticker.', costRange: '₹3–7 per sticker' },
  'rect-100x50': { notes: 'Bumper-style rectangle. Landscape QR layout.', costRange: '₹4–8 per sticker' },
  a2: { material: '5mm PVC foam board', costRange: '₹250–500' },
  a1: { material: '5mm PVC or acrylic', costRange: '₹500–900' },
  '24x36': { material: '5mm PVC or flex banner', costRange: '₹600–1200' },
};

export function getMaterialRecommendation(
  designType: PrintDesignType,
  format: PrintFormat,
): MaterialRecommendation {
  const base = BY_TYPE[designType];
  const override = FORMAT_OVERRIDES[format];
  return override ? { ...base, ...override } : base;
}
