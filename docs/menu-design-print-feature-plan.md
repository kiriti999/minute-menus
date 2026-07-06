# Menu Design & Print Materials Feature Plan

## Overview

A comprehensive menu design system that allows restaurant owners to create professional, print-ready materials including full menus, pamphlets, and QR code stickers in standard Indian print dimensions.

---

## 1. Design Categories & Indian Print Dimensions

### A. Full Menu Card
**Use Case:** Complete menu displayed at tables or counters

| Format | Dimensions (mm) | Dimensions (inches) | Common Use |
|--------|-----------------|---------------------|------------|
| A4 | 210 × 297 | 8.27" × 11.69" | Single-page menu |
| A4 Folded | 210 × 297 (A5 when folded) | Half-fold booklet menu |
| A3 | 297 × 420 | 11.69" × 16.54" | Large display menu |
| Tabloid | 279 × 432 | 11" × 17" | Restaurant poster menu |

**Recommended:** A4 (most economical and widely supported by Indian printers)

---

### A2. Wall Menu Boards
**Use Case:** Wall-mounted menu displays, digital signage, printed boards

| Format | Dimensions (mm) | Dimensions (inches) | Common Use |
|--------|-----------------|---------------------|------------|
| A2 | 420 × 594 | 16.54" × 23.39" | Standard wall board |
| A1 | 594 × 841 | 23.39" × 33.11" | Large wall display |
| A0 | 841 × 1189 | 33.11" × 46.81" | Extra large wall board |
| 18×24 | 457 × 610 | 18" × 24" | US standard poster |
| 24×36 | 610 × 914 | 24" × 36" | Large poster board |
| 36×48 | 914 × 1219 | 36" × 48" | Restaurant wall menu |
| Square 24×24 | 610 × 610 | 24" × 24" | Modern square board |

**Recommended:** A2 (420×594mm) - Most common for Indian restaurants, affordable printing

**Material Options:**
- Foam board mounting (5mm-10mm thick)
- Acrylic sheet (3mm-5mm for premium look)
- PVC board (lightweight, weather-resistant)
- Vinyl sticker on wall
- Laminated paper on board

---

### B. Pamphlet / Flyer
**Use Case:** Takeaway menus, door-to-door distribution, promotional material

| Format | Dimensions (mm) | Dimensions (inches) | Common Use |
|--------|-----------------|---------------------|------------|
| DL (1/3 A4) | 99 × 210 | 3.9" × 8.27" | Tri-fold brochure |
| A5 | 148 × 210 | 5.83" × 8.27" | Half A4, compact menu |
| A6 | 105 × 148 | 4.13" × 5.83" | Postcard-size flyer |
| Square | 148 × 148 | 5.83" × 5.83" | Instagram-style design |

**Recommended:** A5 (cost-effective, easy to carry)

---

### C. Pocket Menu Card with QR
**Use Case:** Wallet-sized takeaway card with QR for digital menu

| Format | Dimensions (mm) | Dimensions (inches) | Common Use |
|--------|-----------------|---------------------|------------|
| Business Card | 90 × 50 | 3.5" × 2" | Standard pocket card |
| Credit Card | 85.6 × 53.98 | 3.37" × 2.13" | ISO 7810 ID-1 standard |
| Mini Card | 85 × 55 | 3.35" × 2.17" | Rounded corner card |

**Recommended:** Business Card (90×50mm) - most affordable, widely printed

---

### D. Menu Sticker with QR
**Use Case:** Window stickers, table stickers, delivery packaging

| Format | Dimensions (mm) | Dimensions (inches) | Common Use |
|--------|-----------------|---------------------|------------|
| Small Circle | Ø 50 | Ø 2" | Packaging sticker |
| Medium Circle | Ø 75 | Ø 3" | Table sticker |
| Large Circle | Ø 100 | Ø 4" | Window/door sticker |
| Square Small | 50 × 50 | 2" × 2" | Compact sticker |
| Square Medium | 75 × 75 | 3" × 3" | Standard sticker |
| Rectangle | 100 × 50 | 4" × 2" | Bumper sticker |

**Recommended:** Medium Circle (Ø75mm) or Square Medium (75×75mm)

---

## 2. Technical Architecture

### A. Data Model

```typescript
// New types in @minute-menus/types
type PrintDesignType = 'menu-card' | 'wall-board' | 'pamphlet' | 'pocket-card' | 'sticker';

type PrintFormat = 
  | 'a4' | 'a4-folded' | 'a3' | 'tabloid'  // Menu cards
  | 'a2' | 'a1' | 'a0' | '18x24' | '24x36' | '36x48' | 'square-24x24'  // Wall boards
  | 'dl' | 'a5' | 'a6' | 'square-148'      // Pamphlets
  | 'business-card' | 'credit-card' | 'mini-card'  // Pocket cards
  | 'circle-50' | 'circle-75' | 'circle-100'       // Stickers (circle)
  | 'square-50' | 'square-75' | 'rect-100x50';     // Stickers (square/rect)

type TemplateStyle = 
  | 'modern-minimal'     // Clean, lots of white space, sans-serif
  | 'classic-elegant'    // Traditional, serif fonts, ornate borders
  | 'rustic-vintage'     // Distressed textures, hand-drawn elements
  | 'bold-colorful'      // Bright colors, eye-catching
  | 'luxury-premium'     // Gold accents, sophisticated
  | 'street-food'        // Casual, vibrant, Indian street style
  | 'cafe-cozy'          // Warm tones, handwritten fonts
  | 'fine-dining'        // Elegant, high-end, minimalist
  | 'fast-food'          // Bold, simple, quick-read
  | 'ethnic-traditional'; // Cultural patterns, regional aesthetics

interface PrintDimensions {
  widthMm: number;
  heightMm: number;
  widthPx: number;   // at 300 DPI for print quality
  heightPx: number;
  dpi: 300;
  bleedMm?: number;  // 3mm standard bleed for print
}

interface MenuDesignTemplate {
  id: string;
  name: string;
  style: TemplateStyle;
  type: PrintDesignType;
  format: PrintFormat;
  dimensions: PrintDimensions;
  thumbnailUrl: string;
  previewUrl: string;
  category: string;
  isPremium: boolean;  // Plus-only templates
}

interface DesignCustomization {
  // Typography
  fonts: {
    heading: FontConfig;
    body: FontConfig;
    price: FontConfig;
  };
  
  // Colors
  colors: {
    primary: string;      // Main brand color
    secondary: string;    // Accent color
    background: string;   // Background color
    text: string;         // Body text color
    textMuted: string;    // Secondary text
    accent: string;       // Highlights, badges
    border: string;       // Dividers, borders
  };
  
  // Layout
  layout: {
    columns: 1 | 2 | 3;   // Menu item columns
    spacing: 'compact' | 'normal' | 'spacious';
    alignment: 'left' | 'center' | 'right';
    categoryStyle: 'heading' | 'banner' | 'badge';
  };
  
  // Content visibility
  showPrices: boolean;
  showDescriptions: boolean;
  showImages: boolean;   // Dish images
  showQR: boolean;
  showLogo: boolean;
  showTagline: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showSocialMedia: boolean;
  
  // Advanced
  backgroundImage?: string;  // Custom background
  logoUrl?: string;
  watermark?: boolean;
  borderStyle: 'none' | 'simple' | 'decorative' | 'rounded';
}

interface FontConfig {
  family: string;  // 'Poppins', 'Playfair Display', 'Roboto', etc.
  size: number;    // in points
  weight: 300 | 400 | 500 | 600 | 700 | 800;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

interface MenuDesignExport {
  id: string;
  restaurantId: string;
  templateId: string;
  designType: PrintDesignType;
  format: PrintFormat;
  customization: DesignCustomization;
  exportFormat: 'pdf' | 'png' | 'svg';
  fileUrl: string;
  createdAt: string;
}
```

### B. Database Schema

```sql
-- Print design exports history
CREATE TABLE menu_design_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  design_type TEXT NOT NULL, -- 'menu-card', 'pamphlet', 'pocket-card', 'sticker'
  format TEXT NOT NULL,       -- 'a4', 'a5', 'business-card', etc.
  export_format TEXT NOT NULL, -- 'pdf', 'png', 'svg'
  file_url TEXT,
  settings JSONB,             -- color scheme, layout, fonts, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_design_exports_restaurant 
  ON menu_design_exports(restaurant_id);

-- RLS policies
ALTER TABLE menu_design_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage design exports"
  ON menu_design_exports FOR ALL
  USING (EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.id = menu_design_exports.restaurant_id 
    AND r.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.id = menu_design_exports.restaurant_id 
    AND r.owner_id = auth.uid()
  ));
```

---

## 3. UI/UX Design

### A. Navigation
Add new tab in Owner Dashboard: **"Print Designs"**

### B. Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Print Designs                                              │
├─────────────────────────────────────────────────────────────┤
│  [Menu Card] [Wall Board] [Pamphlet] [Pocket] [Sticker]  <- Design type tabs
├─────────────────────────────────────────────────────────────┤
│  Step 1: Choose Format                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ A4       │ │ A5       │ │ A3       │ ...               │
│  │210×297mm │ │148×210mm │ │297×420mm │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
│  (For Wall Board: A2, A1, A0, 24×36, etc.)                 │
├─────────────────────────────────────────────────────────────┤
│  Step 2: Select Template Style                             │
│  [All] [Modern] [Classic] [Vintage] [Bold] [Luxury] [More] │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                │
│  │  Modern   │ │  Classic  │ │  Rustic   │                │
│  │  Minimal  │ │  Elegant  │ │  Vintage  │                │
│  │ [Preview] │ │ [Preview] │ │ [Preview] │                │
│  │  ✓ Free   │ │  ⭐ Plus  │ │  ✓ Free   │                │
│  └───────────┘ └───────────┘ └───────────┘                │
│  ... 7 more templates ...                                  │
├─────────────────────────────────────────────────────────────┤
│  Step 3: Customize Design                                  │
│  ┌────────────────────┬────────────────────────────────┐   │
│  │ [Quick] [Advanced] │                                │   │
│  ├────────────────────┤                                │   │
│  │ QUICK PRESETS      │      LIVE PREVIEW             │   │
│  │                    │    ┌────────────────────┐     │   │
│  │ Color Scheme:      │    │                    │     │   │
│  │ [Warm Sunset ▼]    │    │   Restaurant Name  │     │   │
│  │ ○○○○○○○○○○ 20      │    │   ───────────      │     │   │
│  │                    │    │                    │     │   │
│  │ Font Pairing:      │    │  STARTERS          │     │   │
│  │ [Modern Clean ▼]   │    │  • Dish 1  ₹120   │     │   │
│  │ ○○○○○○○○○○ 15      │    │  • Dish 2  ₹150   │     │   │
│  │                    │    │                    │     │   │
│  │ Layout:            │    │  MAINS             │     │   │
│  │ [●] 1 Col [○] 2 Col│    │  • Dish 3  ₹280   │     │   │
│  │                    │    │                    │     │   │
│  │ Spacing:           │    │  [QR Code]         │     │   │
│  │ ────●──── Normal   │    │  Scan to order     │     │   │
│  │                    │    └────────────────────┘     │   │
│  │ Show/Hide:         │                                │   │
│  │ [✓] Prices         │   [Zoom In] [Zoom Out]        │   │
│  │ [✓] Descriptions   │   [Reset View]                │   │
│  │ [✓] QR Code        │                                │   │
│  │ [✓] Logo           │                                │   │
│  │                    │                                │   │
│  │ ──────────────────│                                │   │
│  │                    │                                │   │
│  │ ADVANCED MODE      │                                │   │
│  │ (click Advanced)   │                                │   │
│  │                    │                                │   │
│  │ Colors:            │                                │   │
│  │ Primary    [⬛]     │                                │   │
│  │ Secondary  [⬜]     │                                │   │
│  │ Background [⬜]     │                                │   │
│  │ Text       [⬛]     │                                │   │
│  │ Accent     [🟨]     │                                │   │
│  │                    │                                │   │
│  │ Typography:        │                                │   │
│  │ Heading: [Font ▼]  │                                │   │
│  │ Size: ──●── 24pt   │                                │   │
│  │ Weight: [Bold ▼]   │                                │   │
│  │                    │                                │   │
│  │ Body: [Font ▼]     │                                │   │
│  │ Size: ──●── 14pt   │                                │   │
│  │                    │                                │   │
│  │ Background:        │                                │   │
│  │ [Solid] [Gradient] │                                │   │
│  │ [Pattern] [Image]  │                                │   │
│  │ [Upload Photo]     │                                │   │
│  │                    │                                │   │
│  │ Borders & Effects: │                                │   │
│  │ Style: [Simple ▼]  │                                │   │
│  │ Corners: ──●── 4px │                                │   │
│  │ Shadow: [None ▼]   │                                │   │
│  └────────────────────┴────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Step 4: Restaurant Details                                │
│  Restaurant Name: [Fresh and Fusion________________]        │
│  Tagline: [Delicious Food Delivered_____________]           │
│  Address: [123 Main St, Mumbai___________________]          │
│  Phone: [+91 98765 43210____]  [✓] Show on design          │
│  Social: [@restaurant_______]  [✓] Show on design          │
│  Logo: [Upload] or [📷 Use from profile]                   │
├─────────────────────────────────────────────────────────────┤
│  Step 5: Export & Print                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Final Preview (Full Size)                           │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │                                                │  │  │
│  │  │          [Full design preview here]            │  │  │
│  │  │                                                │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│  Export Options:                                            │
│  [📄 Download PDF (Print Quality)] - 300 DPI, CMYK         │
│  [🖼️ Download PNG (Digital Use)] - High res, RGB           │
│  [📧 Share with Printer] - Email with print specs          │
│                                                             │
│  Print Specifications:                                      │
│  Format: A4 (210×297mm)                                     │
│  Recommended: 300 GSM art card, laminated                   │
│  Estimated cost: ₹5-10 per print (100 qty)                  │
│  [View Full Print Guide]                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Template Library & Styles

### A. Template Styles (10 Popular Designs)

#### 1. **Modern Minimal**
- **Look:** Clean, lots of white space, geometric shapes
- **Fonts:** Poppins, Inter, Montserrat
- **Colors:** Black/white with one accent color
- **Best for:** Cafes, modern bistros, cloud kitchens

#### 2. **Classic Elegant**
- **Look:** Traditional, serif fonts, ornate borders
- **Fonts:** Playfair Display, Cormorant, Libre Baskerville
- **Colors:** Gold, burgundy, navy, cream
- **Best for:** Fine dining, upscale restaurants

#### 3. **Rustic Vintage**
- **Look:** Distressed textures, hand-drawn elements, stamps
- **Fonts:** Bebas Neue, Amatic SC, Permanent Marker
- **Colors:** Brown, beige, faded colors
- **Best for:** Pub, brewery, farm-to-table

#### 4. **Bold Colorful**
- **Look:** Bright colors, large typography, geometric patterns
- **Fonts:** Oswald, Archivo Black, Anton
- **Colors:** Red, yellow, orange, blue (high contrast)
- **Best for:** Fast food, quick service, family restaurants

#### 5. **Luxury Premium**
- **Look:** Sophisticated, gold foil effect, elegant spacing
- **Fonts:** Cinzel, Cormorant Garamond, Italiana
- **Colors:** Black, gold, white, deep purple
- **Best for:** Fine dining, hotel restaurants, lounges

#### 6. **Street Food Vibes**
- **Look:** Casual, vibrant, Indian aesthetic, hand-painted style
- **Fonts:** Baloo Bhai, Fredoka, Righteous
- **Colors:** Saffron, green, red, yellow (Indian flag colors)
- **Best for:** Street food, chaat shops, dhabas

#### 7. **Cafe Cozy**
- **Look:** Warm tones, handwritten fonts, coffee stains
- **Fonts:** Dancing Script, Pacifico, Satisfy
- **Colors:** Brown, cream, soft pastels
- **Best for:** Cafes, bakeries, dessert shops

#### 8. **Fine Dining Minimal**
- **Look:** Ultra-minimal, high-end, spacious
- **Fonts:** Cormorant, Lora, Crimson Text
- **Colors:** Black, white, subtle gold accents
- **Best for:** Michelin-style, gourmet restaurants

#### 9. **Fast Food Pop**
- **Look:** Bold, simple, quick-read, branded
- **Fonts:** Roboto Condensed, Barlow, Work Sans
- **Colors:** Brand colors, high contrast
- **Best for:** QSR, chains, delivery-focused

#### 10. **Ethnic Traditional**
- **Look:** Cultural patterns, regional motifs, traditional art
- **Fonts:** Hind (Devanagari support), Baloo, Tiro Devanagari
- **Colors:** Regional palette (Kerala green/gold, Rajasthan red/yellow)
- **Best for:** Regional cuisine, heritage restaurants

---

### B. Customization System

#### Level 1: Quick Presets (Beginner-friendly)
- **Color Schemes:** 20 pre-made palettes
  - Warm (red, orange, yellow)
  - Cool (blue, green, purple)
  - Neutral (black, white, gray)
  - Vibrant (neon, bright)
  - Earthy (brown, beige, olive)
- **One-click apply** to entire design

#### Level 2: Style Adjustments (Intermediate)
- **Typography:**
  - Font pairing: 15 pre-matched combinations
  - Size slider: Small / Medium / Large
  - Weight: Light / Regular / Bold
  - Text transform: Normal / Uppercase / Capitalize
- **Layout:**
  - Columns: 1 / 2 / 3
  - Spacing: Compact / Normal / Spacious
  - Alignment: Left / Center / Right
- **Visibility toggles:**
  - Show/hide prices
  - Show/hide descriptions
  - Show/hide images
  - Show/hide QR code

#### Level 3: Advanced Customization (Power users)
- **Individual color control:**
  - Primary color picker
  - Secondary color picker
  - Background (solid/gradient)
  - Text color
  - Accent color
  - Border color
- **Typography fine-tuning:**
  - Custom font upload (Google Fonts API)
  - Line height adjustment
  - Letter spacing
  - Individual font per element (heading, body, price)
- **Background:**
  - Solid color
  - Gradient (2-3 colors)
  - Pattern (dots, lines, geometric)
  - Custom image upload
  - Texture overlay (paper, fabric, wood)
- **Border & Effects:**
  - Border style (none, simple, decorative, rounded)
  - Corner radius
  - Shadow/depth
  - Ornamental dividers

---

### C. Font Library

**Available Fonts** (via Google Fonts CDN):

**Sans-Serif (Modern):**
- Poppins, Inter, Montserrat, Roboto, Open Sans, Lato, Raleway, Work Sans

**Serif (Classic):**
- Playfair Display, Cormorant, Libre Baskerville, Lora, Crimson Text, Merriweather

**Display (Bold/Decorative):**
- Bebas Neue, Oswald, Archivo Black, Anton, Righteous

**Handwritten (Casual):**
- Dancing Script, Pacifico, Satisfy, Amatic SC, Permanent Marker

**Indian Script Support:**
- Hind, Baloo Bhai 2, Tiro Devanagari, Mukta, Noto Sans Devanagari

**Implementation:**
```typescript
import WebFont from 'webfontloader';

WebFont.load({
  google: {
    families: [
      'Poppins:300,400,500,600,700',
      'Playfair Display:400,700',
      'Hind:400,600',
      // ... other fonts
    ]
  }
});
```

---

### D. Color Palette Library

**20 Pre-made Color Schemes:**

| Scheme Name | Primary | Secondary | Background | Text | Accent |
|-------------|---------|-----------|------------|------|--------|
| Classic Black | #000000 | #FFD700 | #FFFFFF | #333333 | #C9A961 |
| Warm Sunset | #FF6B35 | #F7931E | #FFF5E1 | #2C3E50 | #FFB266 |
| Ocean Blue | #0077BE | #00A8E8 | #F0F8FF | #1A1A1A | #6DD5FA |
| Forest Green | #2D5016 | #87A96B | #F5F5DC | #1C1C1C | #A4C639 |
| Royal Purple | #4A148C | #7B1FA2 | #F3E5F5 | #212121 | #BA68C8 |
| Spice Red | #B71C1C | #FF5722 | #FFEBEE | #000000 | #FF8A65 |
| Minimalist Gray | #424242 | #757575 | #FAFAFA | #212121 | #9E9E9E |
| Vintage Brown | #5D4037 | #8D6E63 | #EFEBE9 | #3E2723 | #A1887F |
| Indian Saffron | #FF9933 | #138808 | #FFFFFF | #000080 | #FFB366 |
| Cafe Latte | #6F4E37 | #A0826D | #F5F5DC | #3E2723 | #C9A689 |
| Luxury Gold | #1C1C1C | #D4AF37 | #FFFFFF | #000000 | #FFD700 |
| Fresh Mint | #00BFA5 | #1DE9B6 | #E0F2F1 | #004D40 | #64FFDA |
| Berry Blast | #C2185B | #E91E63 | #FCE4EC | #880E4F | #F06292 |
| Sunset Orange | #E65100 | #FF6F00 | #FFF3E0 | #BF360C | #FF9800 |
| Deep Navy | #0D47A1 | #1976D2 | #E3F2FD | #01579B | #42A5F5 |
| Earthy Olive | #827717 | #9E9D24 | #F9FBE7 | #33691E | #C0CA33 |
| Cherry Red | #D32F2F | #F44336 | #FFEBEE | #B71C1C | #EF5350 |
| Slate Modern | #37474F | #546E7A | #ECEFF1 | #263238 | #78909C |
| Peach Cream | #FF6E40 | #FFAB91 | #FFFAF0 | #BF360C | #FFCCBC |
| Teal Calm | #00796B | #26A69A | #E0F2F1 | #004D40 | #4DB6AC |

---

## 5. QR Code Integration

### A. QR Code Content
```
https://minutemenus.com/{restaurant-slug}
```

### B. QR Code Generation
**Library:** `qrcode` (already used in the app)

**Specifications:**
- Size: Minimum 20mm × 20mm for scanability
- Error correction: Level H (30% - highest)
- Color: High contrast (black on white recommended)
- Quiet zone: 4 modules (white border around QR)

### C. QR Placement by Design Type

| Design Type | QR Size | Placement |
|-------------|---------|-----------|
| Menu Card (A4) | 30×30mm | Bottom right corner |
| Pamphlet | 25×25mm | Back page, center |
| Pocket Card | 20×20mm | Back side, full |
| Sticker | 40-80% of design | Center or bottom |

---

## 6. Design Generation Engine

### A. Technology Stack

**Option 1: Canvas-based (Recommended)**
- **Frontend:** HTML Canvas API
- **Export:** `html2canvas` + `jsPDF`
- **Pros:** Full control, no external costs, works offline
- **Cons:** More complex layout code

**Option 2: Template-based**
- **Frontend:** React components styled for print
- **Export:** Browser print API → PDF
- **Pros:** Easier to build, uses existing React skills
- **Cons:** Less precise layout control

**Option 3: Server-side (Future)**
- **Backend:** Puppeteer/Playwright or Chromium PDF
- **Pros:** Better quality, server-rendered
- **Cons:** Requires infrastructure, slower

**Decision:** Start with **Option 2 (Template-based)** for MVP, migrate to Option 1 for fine control later.

---

### B. Template System

```typescript
// Template component structure
interface TemplateProps {
  restaurant: RestaurantPublic;
  menuItems: Category[];
  settings: {
    colorScheme: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
    };
    showPrices: boolean;
    showDescriptions: boolean;
    showQR: boolean;
    qrCodeDataUrl: string;
  };
  dimensions: PrintDimensions;
}

// Example: Modern A4 Menu Template
const ModernA4MenuTemplate: React.FC<TemplateProps> = ({
  restaurant,
  menuItems,
  settings,
  dimensions,
}) => {
  return (
    <div
      className="print-template"
      style={{
        width: `${dimensions.widthMm}mm`,
        height: `${dimensions.heightMm}mm`,
        backgroundColor: settings.colorScheme.background,
        padding: '10mm',
      }}
    >
      {/* Header */}
      <header style={{ color: settings.colorScheme.primary }}>
        <h1>{restaurant.name}</h1>
        <p>{restaurant.tagline || 'Delicious Food Delivered'}</p>
      </header>

      {/* Menu grid */}
      <main>
        {menuItems.map((category) => (
          <section key={category.id}>
            <h2 style={{ color: settings.colorScheme.secondary }}>
              {category.title}
            </h2>
            {category.items.map((dish) => (
              <div key={dish.id} className="menu-item">
                <span>{dish.name}</span>
                {settings.showDescriptions && <p>{dish.description}</p>}
                {settings.showPrices && (
                  <span className="price">
                    {formatPriceInCurrency(dish.price, restaurant.currency)}
                  </span>
                )}
              </div>
            ))}
          </section>
        ))}
      </main>

      {/* Footer with QR */}
      {settings.showQR && (
        <footer>
          <img src={settings.qrCodeDataUrl} alt="Scan for digital menu" />
          <p>Scan to order online</p>
        </footer>
      )}
    </div>
  );
};
```

---

## 7. Export Functionality

### A. PDF Export (Recommended for Print)

**Library:** `jsPDF` + `html2canvas`

```typescript
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

async function exportToPDF(
  elementId: string,
  dimensions: PrintDimensions,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  // Capture as canvas at high DPI
  const canvas = await html2canvas(element, {
    scale: 3, // 3x for 300 DPI equivalent
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  // Create PDF with exact dimensions
  const pdf = new jsPDF({
    orientation: dimensions.widthMm > dimensions.heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [dimensions.widthMm, dimensions.heightMm],
  });

  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, dimensions.widthMm, dimensions.heightMm);

  pdf.save(filename);
}
```

### B. PNG Export (For Digital Use)

```typescript
async function exportToPNG(
  elementId: string,
  dimensions: PrintDimensions,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  const canvas = await html2canvas(element, {
    scale: dimensions.dpi / 96, // Scale to target DPI
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.create('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
```

---

## 8. Implementation Phases

### Phase 1: MVP (Week 1-2)
**Goal:** Basic menu card generation with A4 format + customization

- [ ] Create `PrintDesignsView` component in Owner Dashboard
- [ ] Add "Print Designs" tab navigation
- [ ] Implement design type selector (Menu Card, Wall Board, Pamphlet, etc.)
- [ ] Implement format selector with dimension presets
- [ ] Create 3 basic templates (Modern Minimal, Classic Elegant, Bold Colorful)
- [ ] QR code generation for restaurant slug
- [ ] Basic customization panel (Quick Presets)
  - [ ] Color scheme selector (5 presets)
  - [ ] Font pairing selector (3 presets)
  - [ ] Show/hide toggles (prices, descriptions, QR, logo)
- [ ] Live preview with zoom controls
- [ ] PDF export functionality (300 DPI, print-ready)

**Deliverable:** Owners can generate a printable A4 menu with basic customization

---

### Phase 2: Wall Boards & More Formats (Week 3)
**Goal:** Add wall board designs and expand formats

- [ ] Wall board templates (A2, A1, 24×36)
- [ ] Wall board-specific layouts (larger fonts, sections)
- [ ] A5 pamphlet template
- [ ] Business card (90×50mm) template
- [ ] Format selector UI with visual dimension preview
- [ ] PNG export for digital sharing
- [ ] Template preview thumbnails

**Deliverable:** 5 design types with wall board support

---

### Phase 3: Advanced Customization & Templates (Week 4)
**Goal:** Full template library and advanced customization

- [ ] Complete template library (10 styles × 3 formats = 30 templates)
  - [ ] Modern Minimal
  - [ ] Classic Elegant
  - [ ] Rustic Vintage
  - [ ] Bold Colorful
  - [ ] Luxury Premium
  - [ ] Street Food Vibes
  - [ ] Cafe Cozy
  - [ ] Fine Dining Minimal
  - [ ] Fast Food Pop
  - [ ] Ethnic Traditional
- [ ] Template filtering by style
- [ ] Advanced customization panel
  - [ ] Individual color pickers (6 colors)
  - [ ] Typography controls (font, size, weight per element)
  - [ ] Background options (solid, gradient, pattern, image)
  - [ ] Border & effects (style, corners, shadow)
- [ ] Custom font selector (Google Fonts API)
- [ ] Background image upload
- [ ] Logo upload and positioning
- [ ] Restaurant details form (name, tagline, address, phone, social)

**Deliverable:** Professional-grade customization suite

---

### Phase 4: Stickers & Polish (Week 5)
**Goal:** Sticker designs and production features

- [ ] Circular sticker templates (Ø50, Ø75, Ø100)
- [ ] Square sticker templates (50×50, 75×75)
- [ ] Sticker-specific QR-focused layouts
- [ ] Print bleed and crop marks overlay
- [ ] Color mode selector (RGB for digital, CMYK for print)
- [ ] Material recommendations by design type

**Deliverable:** Complete sticker suite with print specs

---

### Phase 5: Advanced Features (Week 6+)
**Goal:** Premium features and printer integration

- [ ] Multi-page menu support (pagination)
- [ ] A4 folded (bi-fold/tri-fold) templates
- [ ] "Share with Printer" feature
  - [ ] Auto-generate print specification PDF
  - [ ] Email to printer with design + specs
  - [ ] Recommended material, quantity, finish
- [ ] Design history and re-download
- [ ] Duplicate and edit previous designs
- [ ] Plus-tier template gates
- [ ] Regional language support (Hindi, Tamil, etc.)
- [ ] Devanagari font support
- [ ] Print cost estimator (based on format and quantity)
- [ ] Printer directory integration (local print shops)
- [ ] Bulk export (generate multiple formats at once)
- [ ] Brand kit (save colors, fonts, logo as preset)

**Deliverable:** Enterprise-grade print materials platform

---

## 9. Design System Constants & Helpers

### A. Print Constants

```typescript
// packages/design-constants/src/index.ts

export const PRINT_FORMATS = {
  // Menu Cards
  A4: { widthMm: 210, heightMm: 297, widthPx: 2480, heightPx: 3508, dpi: 300, bleedMm: 3 },
  A4_FOLDED: { widthMm: 210, heightMm: 297, widthPx: 2480, heightPx: 3508, dpi: 300, foldType: 'half' },
  A5: { widthMm: 148, heightMm: 210, widthPx: 1748, heightPx: 2480, dpi: 300, bleedMm: 3 },
  A3: { widthMm: 297, heightMm: 420, widthPx: 3508, heightPx: 4961, dpi: 300, bleedMm: 3 },
  
  // Wall Boards
  A2: { widthMm: 420, heightMm: 594, widthPx: 4961, heightPx: 7016, dpi: 300, bleedMm: 5 },
  A1: { widthMm: 594, heightMm: 841, widthPx: 7016, heightPx: 9933, dpi: 300, bleedMm: 5 },
  A0: { widthMm: 841, heightMm: 1189, widthPx: 9933, heightPx: 14043, dpi: 300, bleedMm: 5 },
  POSTER_18X24: { widthMm: 457, heightMm: 610, widthPx: 5400, heightPx: 7200, dpi: 300, bleedMm: 5 },
  POSTER_24X36: { widthMm: 610, heightMm: 914, widthPx: 7200, heightPx: 10800, dpi: 300, bleedMm: 5 },
  POSTER_36X48: { widthMm: 914, heightMm: 1219, widthPx: 10800, heightPx: 14400, dpi: 300, bleedMm: 5 },
  SQUARE_24X24: { widthMm: 610, heightMm: 610, widthPx: 7200, heightPx: 7200, dpi: 300, bleedMm: 5 },
  
  // Pamphlets
  DL: { widthMm: 99, heightMm: 210, widthPx: 1169, heightPx: 2480, dpi: 300, bleedMm: 3 },
  A6: { widthMm: 105, heightMm: 148, widthPx: 1240, heightPx: 1748, dpi: 300, bleedMm: 3 },
  SQUARE_148: { widthMm: 148, heightMm: 148, widthPx: 1748, heightPx: 1748, dpi: 300, bleedMm: 3 },
  
  // Pocket Cards
  BUSINESS_CARD: { widthMm: 90, heightMm: 50, widthPx: 1063, heightPx: 591, dpi: 300, bleedMm: 2 },
  CREDIT_CARD: { widthMm: 85.6, heightMm: 53.98, widthPx: 1011, heightPx: 638, dpi: 300, bleedMm: 2 },
  MINI_CARD: { widthMm: 70, heightMm: 45, widthPx: 827, heightPx: 531, dpi: 300, bleedMm: 2 },
  
  // Stickers
  CIRCLE_50: { diameter: 50, widthPx: 591, heightPx: 591, dpi: 300, shape: 'circle' },
  CIRCLE_75: { diameter: 75, widthPx: 886, heightPx: 886, dpi: 300, shape: 'circle' },
  CIRCLE_100: { diameter: 100, widthPx: 1181, heightPx: 1181, dpi: 300, shape: 'circle' },
  SQUARE_50: { widthMm: 50, heightMm: 50, widthPx: 591, heightPx: 591, dpi: 300, bleedMm: 2 },
  SQUARE_75: { widthMm: 75, heightMm: 75, widthPx: 886, heightPx: 886, dpi: 300, bleedMm: 2 },
  RECT_100X50: { widthMm: 100, heightMm: 50, widthPx: 1181, heightPx: 591, dpi: 300, bleedMm: 2 },
} as const;

export const TEMPLATE_STYLES = [
  'modern-minimal',
  'classic-elegant',
  'rustic-vintage',
  'bold-colorful',
  'luxury-premium',
  'street-food',
  'cafe-cozy',
  'fine-dining',
  'fast-food',
  'ethnic-traditional',
] as const;

export const COLOR_SCHEMES = {
  CLASSIC_BLACK: { primary: '#000000', secondary: '#FFD700', background: '#FFFFFF', text: '#333333', accent: '#C9A961', border: '#CCCCCC' },
  WARM_SUNSET: { primary: '#FF6B35', secondary: '#F7931E', background: '#FFF5E1', text: '#2C3E50', accent: '#FFB266', border: '#FFD4B3' },
  OCEAN_BLUE: { primary: '#0077BE', secondary: '#00A8E8', background: '#F0F8FF', text: '#1A1A1A', accent: '#6DD5FA', border: '#B3D9FF' },
  FOREST_GREEN: { primary: '#2D5016', secondary: '#87A96B', background: '#F5F5DC', text: '#1C1C1C', accent: '#A4C639', border: '#D4E4BC' },
  ROYAL_PURPLE: { primary: '#4A148C', secondary: '#7B1FA2', background: '#F3E5F5', text: '#212121', accent: '#BA68C8', border: '#E1BEE7' },
  SPICE_RED: { primary: '#B71C1C', secondary: '#FF5722', background: '#FFEBEE', text: '#000000', accent: '#FF8A65', border: '#FFCDD2' },
  MINIMALIST_GRAY: { primary: '#424242', secondary: '#757575', background: '#FAFAFA', text: '#212121', accent: '#9E9E9E', border: '#E0E0E0' },
  VINTAGE_BROWN: { primary: '#5D4037', secondary: '#8D6E63', background: '#EFEBE9', text: '#3E2723', accent: '#A1887F', border: '#D7CCC8' },
  INDIAN_SAFFRON: { primary: '#FF9933', secondary: '#138808', background: '#FFFFFF', text: '#000080', accent: '#FFB366', border: '#FFD699' },
  CAFE_LATTE: { primary: '#6F4E37', secondary: '#A0826D', background: '#F5F5DC', text: '#3E2723', accent: '#C9A689', border: '#E6D5C3' },
  LUXURY_GOLD: { primary: '#1C1C1C', secondary: '#D4AF37', background: '#FFFFFF', text: '#000000', accent: '#FFD700', border: '#EBD896' },
  FRESH_MINT: { primary: '#00BFA5', secondary: '#1DE9B6', background: '#E0F2F1', text: '#004D40', accent: '#64FFDA', border: '#A7FFEB' },
  BERRY_BLAST: { primary: '#C2185B', secondary: '#E91E63', background: '#FCE4EC', text: '#880E4F', accent: '#F06292', border: '#F8BBD0' },
  SUNSET_ORANGE: { primary: '#E65100', secondary: '#FF6F00', background: '#FFF3E0', text: '#BF360C', accent: '#FF9800', border: '#FFE0B2' },
  DEEP_NAVY: { primary: '#0D47A1', secondary: '#1976D2', background: '#E3F2FD', text: '#01579B', accent: '#42A5F5', border: '#90CAF9' },
  EARTHY_OLIVE: { primary: '#827717', secondary: '#9E9D24', background: '#F9FBE7', text: '#33691E', accent: '#C0CA33', border: '#E6EE9C' },
  CHERRY_RED: { primary: '#D32F2F', secondary: '#F44336', background: '#FFEBEE', text: '#B71C1C', accent: '#EF5350', border: '#FFCDD2' },
  SLATE_MODERN: { primary: '#37474F', secondary: '#546E7A', background: '#ECEFF1', text: '#263238', accent: '#78909C', border: '#CFD8DC' },
  PEACH_CREAM: { primary: '#FF6E40', secondary: '#FFAB91', background: '#FFFAF0', text: '#BF360C', accent: '#FFCCBC', border: '#FFE4DB' },
  TEAL_CALM: { primary: '#00796B', secondary: '#26A69A', background: '#E0F2F1', text: '#004D40', accent: '#4DB6AC', border: '#B2DFDB' },
} as const;

export const FONT_PAIRINGS = {
  MODERN_CLEAN: { heading: 'Poppins', body: 'Inter', price: 'Poppins' },
  CLASSIC_SERIF: { heading: 'Playfair Display', body: 'Lora', price: 'Cormorant' },
  BOLD_IMPACT: { heading: 'Bebas Neue', body: 'Roboto', price: 'Oswald' },
  HANDWRITTEN: { heading: 'Pacifico', body: 'Open Sans', price: 'Dancing Script' },
  ELEGANT_THIN: { heading: 'Cormorant', body: 'Crimson Text', price: 'Libre Baskerville' },
  STREET_STYLE: { heading: 'Righteous', body: 'Baloo Bhai 2', price: 'Fredoka' },
  MINIMALIST: { heading: 'Montserrat', body: 'Raleway', price: 'Work Sans' },
  INDIAN_MODERN: { heading: 'Hind', body: 'Mukta', price: 'Noto Sans Devanagari' },
  GEOMETRIC: { heading: 'Archivo Black', body: 'Barlow', price: 'Anton' },
  VINTAGE_SERIF: { heading: 'Libre Baskerville', body: 'Merriweather', price: 'Crimson Text' },
  CAFE_WARM: { heading: 'Satisfy', body: 'Open Sans', price: 'Amatic SC' },
  LUXURY_REFINED: { heading: 'Cinzel', body: 'Cormorant Garamond', price: 'Italiana' },
  FAST_FOOD: { heading: 'Roboto Condensed', body: 'Work Sans', price: 'Oswald' },
  RUSTIC: { heading: 'Permanent Marker', body: 'Open Sans', price: 'Bebas Neue' },
  MODERN_SANS: { heading: 'Montserrat', body: 'Lato', price: 'Raleway' },
} as const;

// Helper to convert mm to px at 300 DPI
export function mmToPx(mm: number, dpi: number = 300): number {
  return Math.round((mm / 25.4) * dpi);
}

// Helper to convert px to mm at 300 DPI
export function pxToMm(px: number, dpi: number = 300): number {
  return (px * 25.4) / dpi;
}

// Helper to get format by key
export function getFormatDimensions(format: keyof typeof PRINT_FORMATS) {
  return PRINT_FORMATS[format];
}

// Helper to get color scheme by key
export function getColorScheme(scheme: keyof typeof COLOR_SCHEMES) {
  return COLOR_SCHEMES[scheme];
}

// Helper to get font pairing by key
export function getFontPairing(pairing: keyof typeof FONT_PAIRINGS) {
  return FONT_PAIRINGS[pairing];
}
```

---

### B. Wall Board Specific Considerations

#### Design Differences from Menu Cards

| Aspect | Menu Card | Wall Board |
|--------|-----------|------------|
| **Viewing Distance** | 30-50cm (table) | 2-5 meters (wall) |
| **Font Size** | 10-14pt body, 18-24pt heading | 18-28pt body, 48-72pt heading |
| **Layout** | 2-3 columns, dense | 1-2 columns, spacious |
| **Image Size** | Small thumbnails (40-60mm) | Large images (100-150mm) |
| **QR Code Size** | 25-35mm | 50-75mm (must be scannable from distance) |
| **Color Contrast** | Standard | High contrast for visibility |
| **Information Density** | Full menu | Highlights, best-sellers only |

#### Wall Board Layout Patterns

**Pattern 1: Category Sections (Restaurant Wall)**
```
┌────────────────────────────────────────┐
│    RESTAURANT NAME (Large)             │
│    Tagline (medium)                    │
├────────────────────────────────────────┤
│  STARTERS                              │
│  ┌──────┐  Dish 1.......... ₹120      │
│  │ IMG  │  Description text            │
│  └──────┘                              │
│                                        │
│  MAINS                                 │
│  ┌──────┐  Dish 3.......... ₹280      │
│  │ IMG  │  Description text            │
│  └──────┘                              │
├────────────────────────────────────────┤
│  [Large QR Code]  Scan to order online │
└────────────────────────────────────────┘
```

**Pattern 2: Grid Layout (Fast Food / QSR)**
```
┌────────────────────────────────────────┐
│         RESTAURANT NAME                │
├────────────────────────────────────────┤
│  ┌──────────┐    ┌──────────┐         │
│  │  IMAGE   │    │  IMAGE   │         │
│  ├──────────┤    ├──────────┤         │
│  │ Dish 1   │    │ Dish 2   │         │
│  │ ₹150     │    │ ₹180     │         │
│  └──────────┘    └──────────┘         │
├────────────────────────────────────────┤
│  [QR Code]  SCAN TO ORDER              │
└────────────────────────────────────────┘
```

#### Wall Board Material Recommendations

| Material | Cost (₹/sq.ft) | Pros | Cons | Best For |
|----------|----------------|------|------|----------|
| **Foam Board (10mm)** | 30-40 | Better rigidity | Edges can peel | Short-term (3-6 months) |
| **Acrylic Sheet (3mm)** | 100-150 | Premium look, glossy | Expensive | Fine dining, permanent |
| **PVC Board (3mm)** | 50-80 | Weather-resistant | Slightly flexible | Indoor/outdoor, long-term |
| **Vinyl Sticker on Wall** | 40-60 | Direct wall mount | Hard to remove | Semi-permanent |

**Recommended for Most Restaurants:** PVC Board (3mm) - Balance of cost, durability, and appearance

---

## 10. Dependencies

### New NPM Packages
```json
{
  "dependencies": {
    "jspdf": "^2.5.2",           // PDF generation
    "html2canvas": "^1.4.1"      // HTML to canvas conversion
  }
}
```

**Note:** `qrcode.react` is already installed for QR codes.

---

## 11. Printer Partnership Guide (Future)

### A. Print Specifications Document
Auto-generate a PDF with:
- Design dimensions
- Paper type recommendation (e.g., 300 GSM art card for business cards)
- Finish (glossy/matte)
- Quantity suggestions
- Estimated cost (based on local printing rates)

### B. "Find a Printer" Feature
- Integration with PrintBaba, Vistaprint India, or local print shops
- API to get instant quotes
- Direct order placement (if partnership established)

---

## 12. Success Metrics

### MVP Success Criteria
- ✅ 50+ restaurant owners generate at least one design in first month
- ✅ 70%+ satisfaction with print quality (user survey)
- ✅ <5 seconds to generate PDF export
- ✅ Zero complaints about incorrect dimensions from printers

### Long-term Metrics
- Design exports per restaurant per month
- Most popular design types (menu card vs pamphlet vs stickers)
- Template preferences
- QR code scan-through rate from printed materials

---

## 13. Cost & Revenue Model

### Cost
- **Development:** 3-4 weeks (existing team)
- **Infrastructure:** Negligible (client-side PDF generation)
- **Storage:** Minimal (exports are temporary downloads)

### Revenue Potential (Optional)
- **Free Tier:** A4 menu card only, 1 template
- **Plus Tier:** All formats, all templates, unlimited exports
- **Print Partnership:** 5-10% commission on print orders through the platform

---

## 14. FAQ & Edge Cases

### Q: What about multi-page menus?
**A:** Phase 1 focuses on single-page. Phase 3+ can add pagination.

### Q: What if the menu is too long for A4?
**A:** Auto-detect and suggest A3 or multi-page format. Show live preview with overflow warning.

### Q: Can owners upload their own logo?
**A:** Yes, add logo upload in customization section. Store in Supabase Storage.

### Q: What about localization (Hindi, regional languages)?
**A:** Use system fonts that support Devanagari. Add font picker in Phase 3.

### Q: What if QR doesn't scan?
**A:** Validate QR size minimum (20mm), test with popular scanner apps, provide troubleshooting doc.

---

## 15. Next Steps

1. **Approve this plan** and prioritize phases
2. **Create UI mockups** for PrintDesignsView
3. **Set up print design package** (`packages/print-design`)
4. **Start Phase 1 implementation**
5. **Test with 3-5 pilot restaurants** before full launch

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-07  
**Status:** Awaiting approval
