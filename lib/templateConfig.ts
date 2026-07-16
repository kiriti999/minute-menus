/**
 * Per-template visual configuration — drives the unified MenuTemplate renderer.
 */
import type { TemplateStyle } from "@minute-menus/types";

export type HeaderVariant =
  | 'left-rule' | 'center-ornate' | 'gradient-band' | 'rustic-box'
  | 'luxury-center' | 'street-playful' | 'cafe-warm' | 'fine-sparse'
  | 'fast-bold' | 'ethnic-pattern' | 'name-board';

export type CategoryVariant =
  | 'underline' | 'left-accent' | 'filled-banner' | 'dashed-rustic'
  | 'pill' | 'gold-rule';

export type FooterVariant = 'split' | 'center' | 'strip';

export interface TemplateVisualConfig {
  header: HeaderVariant;
  category: CategoryVariant;
  footer: FooterVariant;
  outerBorder: 'none' | 'simple' | 'double' | 'dashed' | 'decorative';
  showOrnaments: boolean;
  headerGradient: boolean;
  /** Wall boards: filled colour panels vs plain ink on background. */
  wallBlocks?: boolean;
}

export const TEMPLATE_VISUALS: Record<TemplateStyle, TemplateVisualConfig> = {
  'modern-minimal':      { header: 'left-rule',      category: 'underline',      footer: 'split',  outerBorder: 'simple',      showOrnaments: false, headerGradient: false },
  'classic-elegant':     { header: 'center-ornate',  category: 'left-accent',    footer: 'center', outerBorder: 'double',      showOrnaments: true,  headerGradient: false },
  'bold-colorful':       { header: 'gradient-band',  category: 'filled-banner',  footer: 'strip',  outerBorder: 'none',        showOrnaments: false, headerGradient: true  },
  'rustic-vintage':      { header: 'rustic-box',     category: 'dashed-rustic',  footer: 'split',  outerBorder: 'dashed',      showOrnaments: false, headerGradient: false },
  'luxury-premium':      { header: 'luxury-center',  category: 'gold-rule',      footer: 'center', outerBorder: 'decorative',  showOrnaments: true,  headerGradient: false },
  'cafe-cozy':           { header: 'cafe-warm',      category: 'left-accent',    footer: 'center', outerBorder: 'simple',      showOrnaments: false, headerGradient: false },
  'fine-dining-minimal': { header: 'fine-sparse',    category: 'underline',      footer: 'split',  outerBorder: 'none',        showOrnaments: false, headerGradient: false },
  'fast-food-pop':       { header: 'fast-bold',      category: 'filled-banner',  footer: 'strip',  outerBorder: 'simple',      showOrnaments: false, headerGradient: true  },
  'ethnic-traditional':  { header: 'ethnic-pattern', category: 'gold-rule',      footer: 'center', outerBorder: 'decorative',  showOrnaments: true,  headerGradient: false },
  'salad-bowl-fresh':    { header: 'left-rule',      category: 'left-accent',    footer: 'split',  outerBorder: 'simple',      showOrnaments: false, headerGradient: false },
  'south-indian-mess':   { header: 'ethnic-pattern', category: 'gold-rule',      footer: 'center', outerBorder: 'decorative',  showOrnaments: true,  headerGradient: false },
  'name-board-yellow':   { header: 'name-board',     category: 'underline',      footer: 'split',  outerBorder: 'none',        showOrnaments: false, headerGradient: false, wallBlocks: true },
};

export const HEADING_SIZE_SCALE = { small: 0.85, medium: 1, large: 1.2 } as const;
export const BODY_SIZE_SCALE = { small: 0.88, medium: 1, large: 1.12 } as const;
export const HEADING_WEIGHT_MAP = { light: 300, regular: 400, bold: 700 } as const;
export const CORNER_RADIUS_MAP = { none: 0, small: 4, medium: 8, large: 16 } as const;
export const SHADOW_MAP = {
  none: 'none',
  soft: '0 2px 10px rgba(0,0,0,0.08)',
  medium: '0 4px 18px rgba(0,0,0,0.14)',
} as const;
