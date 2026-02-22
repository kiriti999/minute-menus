# CLAUDE.md — Minute Menus

> Context file for AI assistants working on this codebase.

- Always follow solid priniciples, cyclomatic code complexity of 6
- Always follow DRY principle
- Always follow KISS principle
- Always follow YAGNI principle
- Always follow Fail Fast principle
- Always follow Open/Closed principle
- Always follow Liskov Substitution principle
- Always follow Interface Segregation principle
- Always follow Dependency Inversion principle
- Always follow Single Responsibility principle
- Always follow Composition over Inheritance
- Always follow Single Source of Truth
- Always follow Keep It Simple, Stupid principle
- Always follow You Ain't Gonna Need This principle
- Always follow best design patterns
- App should be performant and scalable and should load in less than 2 seconds

---

## Project Overview

**Minute Menus** is a restaurant digital menu platform built with a short-video/reel UX (TikTok-style). Customers browse dishes as vertically-scrolling video reels and order directly. Restaurant owners get a rich analytics dashboard with AI-generated insights.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS (utility-first, dark/monochrome theme) |
| Charts | Recharts |
| Icons | lucide-react |
| AI | Google Gemini (`@google/genai`, model: `gemini-2.5-flash`) |
| State | React `useState` / `useMemo` / `useRef` (no external store) |
| Persistence | `localStorage` (auth flag, menu edits, watch sessions, orders) |
| Package Manager | pnpm |

---

## Key Commands

```bash
pnpm dev        # Start Vite dev server
pnpm build      # Production build (TypeScript + Vite)
pnpm preview    # Preview production build locally
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `API_KEY` | Google Gemini API key — set in `.env`. If missing, the app falls back to demo-mode strings. |

---

## Project Structure

```
/
├── App.tsx                  # Root — routing between LANDING / LOGIN / CUSTOMER / OWNER modes
├── index.tsx                # React DOM entry point
├── index.html               # Vite HTML shell
├── types.ts                 # All shared TypeScript interfaces + enums
├── mockData.ts              # DataService class + seed data (persisted via localStorage)
├── metadata.json            # Static app metadata
│
├── pages/
│   ├── CustomerApp.tsx      # Customer-facing reel viewer + cart + checkout
│   ├── OwnerDashboard.tsx   # Owner analytics dashboard + menu editor (1100 lines)
│   └── LoginPage.tsx        # Simple login gate (mock auth)
│
├── components/
│   ├── ReelCard.tsx         # Single dish reel card (video + overlay UI)
│   └── ReelStrip.tsx        # Horizontal strip/category navigator
│
└── services/
    └── geminiService.ts     # Google Gemini API wrappers
```

---

## Architecture & Data Flow

### App Modes (`AppMode` enum)
```
LANDING → user selects Customer or Owner
LOGIN   → gate for Owner mode (mock auth, persisted in localStorage)
CUSTOMER → CustomerApp
OWNER    → OwnerDashboard (requires auth)
```

### DataService (`mockData.ts`)
A singleton class (`dataService`) that wraps all data access. Persists to `localStorage` keys:
- `mm_menu` — menu categories/dishes (owner edits survive refresh)
- `mm_watch_sessions` — array of `WatchSession` objects
- `mm_orders` — array of `Order` objects
- `mm_auth` — `'true'` string flag for auth state

### Customer Flow
1. `CustomerApp` loads all dishes (max **10 items** shown — strict product requirement).
2. Vertical scroll snaps between reels.
3. Watch sessions auto-recorded per dish view (>1s threshold; "completed" if >5s).
4. Cart managed locally; checkout writes an `Order` to `dataService`.

### Owner Dashboard Features
- **Dashboard tab** — aggregated metrics, recharts graphs, AI insights button
- **Menu tab** — CRUD for categories and dishes, image/video transform controls
- **Customers tab** — per-dish engagement table
- **Paywall** — `UserTier.FREE` vs `UserTier.PLUS`; Plus features show `PaywallModal`
- AI insights call `getAiInsights()` → Gemini with dish performance + traffic history

---

## Types Quick Reference

```typescript
Dish            // id, name, description, price, imageUrl, videoUrl, category, popularityScore, prepTime, mediaTransform?
Category        // id, title, items: Dish[]
OrderItem       // dishId, quantity, name, price
Order           // id, items, totalAmount, timestamp, timeToOrder
WatchSession    // reelId, startTime, duration, completed, timestamp
AggregatedMetrics // totalViews, totalOrders, conversionRate, hourlyTraffic, dishPerformance, ...
AppMode         // LANDING | LOGIN | CUSTOMER | OWNER
UserTier        // FREE | PLUS
```

---

## Coding Conventions

- **No external state library** — keep state in React hooks, lifted where needed.
- **Tailwind only** — no CSS modules or global stylesheets. Dark (`bg-black`, `bg-zinc-*`) monochrome palette.
- **TypeScript strict** — all props and return types explicitly typed.
- **Component size** — large page-level components (e.g., `OwnerDashboard.tsx`) are intentional monoliths; extract sub-components with inline definitions inside the file.
- **Mock auth** — `localStorage.getItem('mm_auth') === 'true'`; do not add a real backend without updating `DataService`.
- **Gemini fallback** — always return a user-friendly string if `API_KEY` is missing or the API call fails.

---

## Things to Watch Out For

- `CustomerApp` hard-limits dishes to **10** via `.slice(0, 10)`. Do not remove this without product approval.
- `OwnerDashboard.tsx` is ~1100 lines. When editing, search for the relevant inner component (e.g., `PaywallModal`, `MenuEditor`) rather than scrolling linearly.
- Media (images/videos) come from Pexels CDN. Offline or CORS environments may not load them.
- `dataService` is a module-level singleton — state mutations from tests will persist across test cases if `localStorage` is not cleared.
