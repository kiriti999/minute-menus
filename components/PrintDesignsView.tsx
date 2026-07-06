/**
 * PrintDesignsView — Phase 2
 * Adds: wall-board-aware layouts, pocket-card, logo upload, gradient backgrounds,
 * advanced individual colour pickers, format dimension thumbnails, Google Fonts loading.
 */
import type {
  Category,
  ColorSchemeKey,
  DesignCustomization,
  FontPairingKey,
  PrintDesignType,
  PrintFormat,
  RestaurantBranding,
  TemplateStyle,
} from "@minute-menus/types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileImage,
  Image as ImageIcon,
  Layers,
  Loader2,
  Palette,
  Printer,
  RefreshCw,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  COLOR_SCHEMES,
  defaultCustomization,
  DESIGN_TYPE_FORMATS,
  DEFAULT_FORMAT,
  FONT_PAIRINGS,
  FORMATS,
  GRADIENT_PRESETS,
  TEMPLATES,
} from "../lib/printDesigns";
import { supabaseService } from "../services/supabaseService";
import MenuTemplate from "./print-designs/MenuTemplate";

export interface PrintDesignsViewProps {
  menuItems: Category[];
  restaurantId: string | null;
  isDarkTheme: boolean;
}

const DESIGN_TYPES: { key: PrintDesignType; label: string; icon: string }[] = [
  { key: 'menu-card',   label: 'Menu Card',   icon: '📋' },
  { key: 'wall-board',  label: 'Wall Board',  icon: '🗓️' },
  { key: 'pamphlet',    label: 'Pamphlet',    icon: '📄' },
  { key: 'pocket-card', label: 'Pocket Card', icon: '🪪' },
  { key: 'sticker',     label: 'Sticker',     icon: '🔵' },
];

const PREVIEW_CSS_WIDTH = 380;

// ─── Format aspect-ratio thumbnail ────────────────────────────────────────────

function FormatThumb({ w, h, active }: { w: number; h: number; active: boolean }) {
  const maxW = 32;
  const maxH = 44;
  const ratio = w / h;
  const thumbW = ratio >= 1 ? maxW : Math.round(maxH * ratio);
  const thumbH = ratio >= 1 ? Math.round(maxW / ratio) : maxH;
  return (
    <div
      style={{ width: thumbW, height: thumbH }}
      className={`rounded-sm border flex-shrink-0 ${active ? 'border-current' : 'border-zinc-400 opacity-40'}`}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PrintDesignsView: React.FC<PrintDesignsViewProps> = ({
  menuItems,
  restaurantId,
  isDarkTheme,
}) => {
  const exportRef = useRef<HTMLDivElement>(null);

  const [designType, setDesignType] = useState<PrintDesignType>('menu-card');
  const [format, setFormat] = useState<PrintFormat>('a4');
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('modern-minimal');
  const [custom, setCustom] = useState<DesignCustomization>(defaultCustomization('modern-minimal'));
  const [branding, setBranding] = useState<RestaurantBranding>({ name: '', tagline: '', address: '', phone: '', slug: '' });
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [showAdvancedColors, setShowAdvancedColors] = useState(false);

  // Load restaurant branding once
  useEffect(() => {
    if (!restaurantId) return;
    supabaseService.getRestaurantDetails().then((d) => {
      setBranding({ name: d.name ?? '', tagline: d.tagline ?? '', address: d.address ?? '', phone: d.phone ?? '', slug: d.slug ?? '' });
    }).catch(() => {});
  }, [restaurantId]);

  // Dynamically load Google Fonts for the selected pairing
  useEffect(() => {
    const families = FONT_PAIRINGS[custom.fontPairing].googleFonts.join('&family=');
    const href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
    let link = document.getElementById('gf-print-designs') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = 'gf-print-designs';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = href;
  }, [custom.fontPairing]);

  const fmt = FORMATS[format];
  const siteUrl = branding.slug
    ? `${import.meta.env.VITE_SITE_URL ?? 'https://minutemenus.com'}/${branding.slug}`
    : import.meta.env.VITE_SITE_URL ?? 'https://minutemenus.com';

  const previewScale = PREVIEW_CSS_WIDTH / fmt.widthPx;
  const previewCssHeight = fmt.heightPx * previewScale;

  const handleDesignTypeChange = useCallback((t: PrintDesignType) => {
    setDesignType(t);
    setFormat(DEFAULT_FORMAT[t]);
  }, []);

  const handleTemplateChange = useCallback((s: TemplateStyle) => {
    setTemplateStyle(s);
    setCustom(defaultCustomization(s));
  }, []);

  const handleColorScheme = useCallback((key: ColorSchemeKey) => {
    const scheme = COLOR_SCHEMES[key];
    setCustom((prev) => ({
      ...prev,
      colorScheme: key,
      colors: { primary: scheme.primary, secondary: scheme.secondary, background: scheme.background, text: scheme.text, textMuted: scheme.textMuted, accent: scheme.accent, border: scheme.border },
    }));
  }, []);

  const handleFontPairing = useCallback((key: FontPairingKey) => {
    const pairing = FONT_PAIRINGS[key];
    setCustom((prev) => ({ ...prev, fontPairing: key, fonts: { heading: pairing.heading, body: pairing.body, price: pairing.price } }));
  }, []);

  const patchCustom = useCallback(<K extends keyof DesignCustomization>(key: K, value: DesignCustomization[K]) => {
    setCustom((prev) => ({ ...prev, [key]: value }));
  }, []);

  const patchColor = useCallback((colorKey: keyof DesignCustomization['colors'], value: string) => {
    setCustom((prev) => ({ ...prev, colors: { ...prev.colors, [colorKey]: value } }));
  }, []);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') patchCustom('logoUrl', result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [patchCustom]);

  const exportPdf = useCallback(async () => {
    const el = exportRef.current;
    if (!el) return;
    setExporting(true);
    setExportMsg('');
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: custom.colors.background, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: fmt.widthMm > fmt.heightMm ? 'landscape' : 'portrait', unit: 'mm', format: [fmt.widthMm, fmt.heightMm] });
      pdf.addImage(imgData, 'PNG', 0, 0, fmt.widthMm, fmt.heightMm);
      pdf.save(`${branding.name || 'menu'}-${format}.pdf`);
      setExportMsg('PDF downloaded!');
    } catch {
      setExportMsg('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  }, [branding.name, custom.colors.background, fmt, format]);

  const exportPng = useCallback(async () => {
    const el = exportRef.current;
    if (!el) return;
    setExporting(true);
    setExportMsg('');
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: custom.colors.background, logging: false });
      const link = document.createElement('a');
      link.download = `${branding.name || 'menu'}-${format}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setExportMsg('PNG downloaded!');
    } catch {
      setExportMsg('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  }, [branding.name, custom.colors.background, format]);

  // ─── Style helpers ───────────────────────────────────────────────────────────
  const card = isDarkTheme ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200';
  const muted = isDarkTheme ? 'text-zinc-500' : 'text-zinc-500';
  const inputCls = isDarkTheme ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900';
  const activeTab = isDarkTheme ? 'bg-white text-black' : 'bg-zinc-900 text-white';
  const inactiveTab = isDarkTheme ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100';

  const colorLabels: { key: keyof DesignCustomization['colors']; label: string }[] = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'background', label: 'Background' },
    { key: 'text', label: 'Text' },
    { key: 'accent', label: 'Accent' },
    { key: 'border', label: 'Border' },
  ];

  return (
    <div className={`flex-1 overflow-y-auto pb-24 ${isDarkTheme ? 'bg-black' : 'bg-zinc-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-20 backdrop-blur-md px-6 py-5 border-b flex items-center justify-between ${isDarkTheme ? 'bg-black/80 border-zinc-800' : 'bg-white/80 border-zinc-200'}`}>
        <div>
          <h1 className={`text-2xl font-light tracking-tight ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>Print Designs</h1>
          <p className={`text-xs mt-0.5 ${muted}`}>Create print-ready menus, wall boards, pamphlets, and stickers</p>
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase ${muted}`}>
          <Printer size={14} />
          {fmt.widthMm}×{fmt.heightMm}mm
        </div>
      </header>

      <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">

          {/* ── Left: Controls ── */}
          <div className="space-y-5">

            {/* Step 1: Design type */}
            <section className={`border rounded-xl p-5 ${card}`}>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${muted}`}>1. Design Type</h2>
              <div className="flex flex-wrap gap-2">
                {DESIGN_TYPES.map((dt) => (
                  <button
                    key={dt.key}
                    onClick={() => handleDesignTypeChange(dt.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${designType === dt.key ? activeTab : inactiveTab} border ${isDarkTheme ? 'border-zinc-700' : 'border-zinc-200'}`}
                  >
                    <span>{dt.icon}</span>
                    {dt.label}
                  </button>
                ))}
              </div>
              {(designType === 'pocket-card' || designType === 'sticker') && (
                <p className={`text-[10px] mt-2 ${muted}`}>This format shows QR code + restaurant info only — too compact for a full dish list.</p>
              )}
              {designType === 'wall-board' && (
                <p className={`text-[10px] mt-2 ${muted}`}>Wall board fonts scale up automatically for easy reading from a distance.</p>
              )}
            </section>

            {/* Step 2: Format with visual thumbnails */}
            <section className={`border rounded-xl p-5 ${card}`}>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${muted}`}>2. Paper Format</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DESIGN_TYPE_FORMATS[designType].map((f) => {
                  const fi = FORMATS[f];
                  const isActive = format === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`rounded-lg border p-3 text-left flex items-center gap-3 transition-all ${isActive ? isDarkTheme ? 'border-white bg-zinc-800' : 'border-zinc-900 bg-zinc-100' : isDarkTheme ? 'border-zinc-800 hover:border-zinc-600' : 'border-zinc-200 hover:border-zinc-400'}`}
                    >
                      <FormatThumb w={fi.widthMm} h={fi.heightMm} active={isActive} />
                      <div>
                        <div className={`text-sm font-semibold ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{fi.label}</div>
                        <div className={`text-[10px] font-mono mt-0.5 ${muted}`}>{fi.widthMm}×{fi.heightMm}mm</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 3: Template style */}
            <section className={`border rounded-xl p-5 ${card}`}>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${muted}`}>3. Template Style</h2>
              <div className="grid grid-cols-3 gap-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => handleTemplateChange(t.key)}
                    className={`rounded-lg border p-3 text-left transition-all ${templateStyle === t.key ? isDarkTheme ? 'border-white bg-zinc-800' : 'border-zinc-900 bg-zinc-100' : isDarkTheme ? 'border-zinc-800 hover:border-zinc-600' : 'border-zinc-200 hover:border-zinc-400'}`}
                  >
                    <div className={`text-sm font-semibold ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{t.label}</div>
                    <div className={`text-[10px] mt-1 ${muted}`}>{t.description}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Step 4: Logo */}
            <section className={`border rounded-xl p-5 ${card}`}>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${muted}`}>4. Logo <span className={`font-normal normal-case ${muted}`}>(optional)</span></h2>
              {custom.logoUrl ? (
                <div className="flex items-center gap-4">
                  <img src={custom.logoUrl} alt="Logo preview" className="h-16 w-auto object-contain rounded border" style={{ borderColor: isDarkTheme ? '#3f3f46' : '#e4e4e7' }} />
                  <div className="space-y-1">
                    <p className={`text-xs ${muted}`}>Logo will appear above the restaurant name in the design.</p>
                    <button
                      onClick={() => patchCustom('logoUrl', undefined)}
                      className={`flex items-center gap-1 text-xs text-red-400 hover:text-red-500`}
                    >
                      <X size={11} /> Remove logo
                    </button>
                  </div>
                </div>
              ) : (
                <label className={`flex items-center gap-3 border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer transition-colors ${isDarkTheme ? 'border-zinc-700 hover:border-zinc-500' : 'border-zinc-300 hover:border-zinc-400'}`}>
                  <ImageIcon size={18} className={muted} />
                  <div>
                    <p className={`text-sm font-medium ${isDarkTheme ? 'text-white' : 'text-zinc-800'}`}>Upload logo image</p>
                    <p className={`text-[10px] ${muted}`}>PNG, JPG or SVG — transparent PNG recommended</p>
                  </div>
                  <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
                </label>
              )}
            </section>

            {/* Step 5: Customise */}
            <section className={`border rounded-xl p-5 ${card}`}>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-4 ${muted}`}>5. Customise</h2>

              {/* Colour scheme */}
              <div className="mb-4">
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${muted}`}>Colour Scheme</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(COLOR_SCHEMES) as [ColorSchemeKey, typeof COLOR_SCHEMES[ColorSchemeKey]][]).map(([key, scheme]) => (
                    <button
                      key={key}
                      onClick={() => handleColorScheme(key)}
                      title={scheme.label}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${custom.colorScheme === key ? isDarkTheme ? 'border-white' : 'border-zinc-900' : isDarkTheme ? 'border-zinc-700 hover:border-zinc-500' : 'border-zinc-200 hover:border-zinc-400'}`}
                    >
                      <span className="w-3 h-3 rounded-full inline-block border border-zinc-300" style={{ background: scheme.primary }} />
                      <span className={isDarkTheme ? 'text-zinc-300' : 'text-zinc-700'}>{scheme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background type */}
              <div className="mb-4">
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${muted}`}>Background</p>
                <div className="flex gap-2 mb-2">
                  {(['solid', 'gradient'] as const).map((bt) => (
                    <button
                      key={bt}
                      onClick={() => patchCustom('backgroundType', bt)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all capitalize ${custom.backgroundType === bt ? isDarkTheme ? 'border-white bg-zinc-800 text-white' : 'border-zinc-900 bg-zinc-100 text-zinc-900' : isDarkTheme ? 'border-zinc-700 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
                {custom.backgroundType === 'gradient' && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {GRADIENT_PRESETS.map((g) => {
                      const isActive = custom.backgroundGradient === g.value;
                      return (
                        <button
                          key={g.value}
                          onClick={() => patchCustom('backgroundGradient', g.value)}
                          title={g.label}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${isActive ? isDarkTheme ? 'border-white' : 'border-zinc-900' : isDarkTheme ? 'border-zinc-700 hover:border-zinc-500' : 'border-zinc-200 hover:border-zinc-400'}`}
                        >
                          <span
                            className="w-4 h-3 rounded-sm inline-block flex-shrink-0"
                            style={{ background: g.value }}
                          />
                          <span className={isDarkTheme ? 'text-zinc-300' : 'text-zinc-700'}>{g.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Font pairing */}
              <div className="mb-4">
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${muted}`}>Font Pairing</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(FONT_PAIRINGS) as [FontPairingKey, typeof FONT_PAIRINGS[FontPairingKey]][]).map(([key, pairing]) => (
                    <button
                      key={key}
                      onClick={() => handleFontPairing(key)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${custom.fontPairing === key ? isDarkTheme ? 'border-white bg-zinc-800' : 'border-zinc-900 bg-zinc-100' : isDarkTheme ? 'border-zinc-700 hover:border-zinc-600' : 'border-zinc-200 hover:border-zinc-400'} ${isDarkTheme ? 'text-zinc-300' : 'text-zinc-700'}`}
                    >
                      {pairing.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout columns */}
              <div className="mb-4">
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${muted}`}>Columns</p>
                <div className="flex gap-2">
                  {([1, 2] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => patchCustom('layout', { ...custom.layout, columns: c })}
                      className={`px-4 py-1.5 rounded-full text-xs border transition-all ${custom.layout.columns === c ? isDarkTheme ? 'border-white bg-zinc-800 text-white' : 'border-zinc-900 bg-zinc-100 text-zinc-900' : isDarkTheme ? 'border-zinc-700 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}
                    >
                      {c} col
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility toggles */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {([
                  ['showPrices', 'Prices'],
                  ['showDescriptions', 'Descriptions'],
                  ['showQR', 'QR Code'],
                  ['showTagline', 'Tagline'],
                ] as [keyof DesignCustomization, string][]).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => patchCustom(k, !custom[k])}
                      className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${custom[k] ? 'bg-green-500' : isDarkTheme ? 'bg-zinc-700' : 'bg-zinc-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${custom[k] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                    <span className={`text-xs ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>{label}</span>
                  </label>
                ))}
              </div>

              {/* Advanced colour pickers */}
              <button
                onClick={() => setShowAdvancedColors((v) => !v)}
                className={`flex items-center gap-2 text-xs font-semibold ${isDarkTheme ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-800'} transition-colors`}
              >
                <Palette size={13} />
                Advanced Colours
                {showAdvancedColors ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showAdvancedColors && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {colorLabels.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={custom.colors[key]}
                        onChange={(e) => patchColor(key, e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                      />
                      <span className={`text-xs ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* Step 6: Restaurant details */}
            <section className={`border rounded-xl p-5 ${card}`}>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${muted}`}>6. Restaurant Details</h2>
              <div className="space-y-3">
                {(['name', 'tagline', 'phone', 'address'] as const).map((field) => (
                  <div key={field}>
                    <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${muted}`}>{field}</label>
                    <input
                      value={branding[field]}
                      onChange={(e) => setBranding((b) => ({ ...b, [field]: e.target.value }))}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputCls}`}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── Right: Live Preview + Export ── */}
          <div className="space-y-5">
            <section className={`border rounded-xl p-5 ${card}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-xs font-bold uppercase tracking-widest ${muted}`}>Live Preview</h2>
                <div className={`flex items-center gap-1 text-[10px] ${muted}`}>
                  <Layers size={11} />
                  {fmt.label}
                </div>
              </div>

              <div
                style={{ width: PREVIEW_CSS_WIDTH, height: Math.round(previewCssHeight) }}
                className={`relative overflow-hidden rounded border ${isDarkTheme ? 'border-zinc-700' : 'border-zinc-300'} mx-auto`}
              >
                <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left', width: fmt.widthPx, height: fmt.heightPx, pointerEvents: 'none' }}>
                  <MenuTemplate
                    style={templateStyle}
                    designType={designType}
                    customization={custom}
                    branding={branding}
                    menuItems={menuItems}
                    widthPx={fmt.widthPx}
                    heightPx={fmt.heightPx}
                    siteUrl={siteUrl}
                  />
                </div>
              </div>

              <p className={`text-[10px] text-center mt-2 ${muted}`}>
                Preview is scaled — export at full {fmt.widthMm}×{fmt.heightMm}mm
              </p>
            </section>

            {/* Export */}
            <section className={`border rounded-xl p-5 ${card}`}>
              <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${muted}`}>Export & Download</h2>

              {exportMsg && (
                <div className={`flex items-center gap-2 text-xs mb-3 ${exportMsg.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>
                  <Check size={12} />
                  {exportMsg}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => void exportPdf()}
                  disabled={exporting || menuItems.length === 0}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-widest disabled:opacity-40 transition-colors ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-700'}`}
                >
                  {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  DOWNLOAD PDF
                </button>
                <button
                  onClick={() => void exportPng()}
                  disabled={exporting || menuItems.length === 0}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-widest border disabled:opacity-40 transition-colors ${isDarkTheme ? 'border-zinc-600 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-300 hover:bg-zinc-100 text-zinc-700'}`}
                >
                  {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
                  DOWNLOAD PNG
                </button>
              </div>

              <div className={`mt-4 rounded-lg p-3 text-[10px] space-y-1 ${isDarkTheme ? 'bg-zinc-900 text-zinc-500' : 'bg-zinc-50 text-zinc-500'}`}>
                <div className="font-semibold uppercase tracking-wider">Print Specs</div>
                <div>Format: {fmt.label} ({fmt.widthMm}×{fmt.heightMm}mm)</div>
                <div>Bleed: {fmt.bleedMm}mm on each side</div>
                <div>Recommended: 300 GSM art card, matt lamination</div>
                <div className="pt-1">
                  {designType === 'menu-card' && 'Avg cost: ₹5–15 per print (100 qty)'}
                  {designType === 'wall-board' && 'Avg cost: ₹150–400 (A2 PVC board)'}
                  {designType === 'pamphlet' && 'Avg cost: ₹2–8 per print (500 qty)'}
                  {designType === 'pocket-card' && 'Avg cost: ₹1–3 per card (250 qty)'}
                  {designType === 'sticker' && 'Avg cost: ₹3–8 per sticker (100 qty)'}
                </div>
              </div>
            </section>

            {menuItems.length === 0 && (
              <div className={`rounded-xl border p-4 text-sm text-center ${isDarkTheme ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-500'}`}>
                <RefreshCw size={20} className="mx-auto mb-2 opacity-40" />
                Add dishes in Menu Editor — they'll appear here for your design.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Off-screen full-resolution render target for html2canvas */}
      <div style={{ position: 'fixed', top: -99999, left: -99999, width: fmt.widthPx, height: fmt.heightPx, pointerEvents: 'none', zIndex: -1 }}>
        <div ref={exportRef}>
          <MenuTemplate
            style={templateStyle}
            designType={designType}
            customization={custom}
            branding={branding}
            menuItems={menuItems}
            widthPx={fmt.widthPx}
            heightPx={fmt.heightPx}
            siteUrl={siteUrl}
          />
        </div>
      </div>
    </div>
  );
};
