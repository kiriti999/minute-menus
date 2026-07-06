/** Gradient presets — split to keep printDesigns.ts under size limits. */
export interface GradientPreset {
  label: string;
  value: string;
  from: string;
  to: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { label: 'Sunset',  value: 'linear-gradient(135deg,#FF6B35,#C0392B)', from: '#FF6B35', to: '#C0392B' },
  { label: 'Ocean',   value: 'linear-gradient(135deg,#1565C0,#00BCD4)', from: '#1565C0', to: '#00BCD4' },
  { label: 'Forest',  value: 'linear-gradient(135deg,#2E7D32,#A5D6A7)', from: '#2E7D32', to: '#A5D6A7' },
  { label: 'Gold',    value: 'linear-gradient(135deg,#F9A825,#E65100)', from: '#F9A825', to: '#E65100' },
  { label: 'Night',   value: 'linear-gradient(135deg,#1C1C1C,#3949AB)', from: '#1C1C1C', to: '#3949AB' },
  { label: 'Rose',    value: 'linear-gradient(135deg,#C2185B,#F48FB1)', from: '#C2185B', to: '#F48FB1' },
  { label: 'Saffron', value: 'linear-gradient(135deg,#FF6F00,#FDD835)', from: '#FF6F00', to: '#FDD835' },
  { label: 'Teal',    value: 'linear-gradient(135deg,#00695C,#80CBC4)', from: '#00695C', to: '#80CBC4' },
];
