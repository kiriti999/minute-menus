# MINUTE MENUS

> A short-video restaurant menu platform — TikTok-style dish browsing for customers, AI-powered analytics for owners.

---

## What Is It?

Minute Menus reimagines the restaurant menu as a vertical video reel experience. Instead of a static PDF or webpage, customers scroll through full-screen dish videos (like a food reel), add items to their cart, and check out — all without leaving the browsing flow.

Restaurant owners get a complementary dashboard with real-time engagement analytics, menu management, and AI-generated insights powered by Google Gemini.

---

## Intent & Goals

| Goal | How it's achieved |
|---|---|
| Reduce time-to-order | Immersive reel UX keeps users engaged; cart is always one tap away |
| Increase dish discovery | Full-screen video showcases dishes better than text/images alone |
| Give owners actionable data | Watch sessions, conversion rates, and per-dish performance tracked automatically |
| Lower the tech barrier | No app install required — pure web, mobile-first |
| AI-assisted decisions | Gemini surfaces star dishes, missed opportunities, and A/B test ideas |

---

## User Roles

### Customer
- Browses up to 10 dish reels (full-screen vertical scroll, auto-play video)
- Taps to mute/unmute, adds dishes to cart
- Checks out — order is recorded with a "time to order" metric
- No login required

### Owner (Login required)
- **Dashboard** — views total views, orders, conversion rate, watch-time graphs
- **Menu Editor** — adds/edits/deletes categories and dishes, adjusts media crop/zoom/position
- **Customers tab** — per-dish engagement table (views, watch time, conversion)
- **AI Insights** — one-click Gemini analysis: star dish, opportunity dish, A/B test suggestion
- **Plus tier** — advanced features (export, real-time graphs) gated behind `PaywallModal`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS — dark monochrome palette |
| Charts | Recharts |
| Icons | lucide-react |
| AI | Google Gemini (`gemini-2.5-flash` via `@google/genai`) |
| State | React hooks only (`useState`, `useMemo`, `useRef`) |
| Persistence | `localStorage` via `DataService` singleton |
| Package Manager | pnpm |

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- pnpm (`npm install -g pnpm`)

### Install & Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment Variables

Create a `.env` file in the project root:

```env
API_KEY=your_google_gemini_api_key
```

Without this key the app runs in **demo mode** — all features work but AI insights return a placeholder string.

### Build for Production

```bash
pnpm build
pnpm preview
```

---

## Project Structure

```
/
├── App.tsx                  # Root routing (LANDING → LOGIN → CUSTOMER / OWNER)
├── types.ts                 # All shared interfaces and enums
├── mockData.ts              # DataService singleton + seed menu data
│
├── pages/
│   ├── CustomerApp.tsx      # Reel viewer, cart, checkout
│   ├── OwnerDashboard.tsx   # Analytics dashboard + menu editor
│   └── LoginPage.tsx        # Mock auth gate
│
├── components/
│   ├── ReelCard.tsx         # Single dish reel (video + overlay + add-to-cart)
│   └── ReelStrip.tsx        # Horizontal category navigator
│
└── services/
    └── geminiService.ts     # Gemini API wrappers (getAiInsights, generateMarketingCopy)
```

---

## Key Design Decisions

- **10-dish limit** on the customer reel — intentional product constraint to keep the experience focused.
- **No external state library** — React hooks are sufficient; avoids unnecessary complexity.
- **Mock auth** — `localStorage` flag (`mm_auth`) simulates login. No backend required.
- **DataService pattern** — all `localStorage` reads/writes go through `dataService`; never access `localStorage` directly.
- **Gemini fallback** — every AI call returns a safe string when `API_KEY` is absent or the API errors.

---

## Pricing Tiers

| Feature | Free | Plus |
|---|---|---|
| Menu categories | 3 | Unlimited |
| Basic analytics | ✅ | ✅ |
| Real-time engagement graphs | — | ✅ |
| AI-powered insights | — | ✅ |
| Data export (CSV/PDF) | — | ✅ |

Plus: **$10/mo** (annual) or **$12/mo** (monthly).
