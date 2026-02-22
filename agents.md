# agents.md — AI Agent Guide for Minute Menus

> Guidelines and context for AI coding agents (Copilot, Cursor, Claude, etc.) working on this repo.

- Always follow solid priniciples, cyclomatic code complexity of 6 for functions and 11 for .tsx and 18 .ts files
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

## Active AI Integration

### `services/geminiService.ts`
The only production AI integration. Two exported async functions:

| Function | Model | Purpose |
|---|---|---|
| `getAiInsights(dishPerformance, trafficHistory)` | `gemini-2.5-flash` | Returns 3-bullet executive summary (Star Dish, Opportunity, A/B test suggestion) |
| `generateMarketingCopy(dishName, ingredients)` | `gemini-2.5-flash` | Returns a 10-word marketing hook string |

**Always guard against missing `API_KEY`** — both functions return a safe fallback string when `process.env.API_KEY` is falsy. Maintain this pattern for any new AI calls.

---

## Agent Task Guidelines

### When adding a new feature
1. Check `types.ts` first — add any new interfaces/enums there, not inline.
2. Persist new data through `DataService` in `mockData.ts`, not directly via `localStorage`.
3. If the feature is Plus-tier only, wrap it in the existing `PaywallModal` pattern inside `OwnerDashboard.tsx`.

### When modifying the menu schema (`Dish` / `Category`)
- Update `types.ts` → update seed data in `mockData.ts` → update all spreads in `OwnerDashboard.tsx` menu editor.
- `mediaTransform` is optional — guard with `?.` everywhere.

### When adding a new Gemini call
```typescript
// Template
export const myNewAiCall = async (input: MyType): Promise<string> => {
  if (!process.env.API_KEY) return "Fallback message.";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Your prompt here: ${JSON.stringify(input)}`,
    });
    return response.text || "No result.";
  } catch (e) {
    console.error("Gemini error:", e);
    return "Error fallback.";
  }
};
```

### When editing `OwnerDashboard.tsx`
- The file is ~1100 lines. Use search/grep to navigate to the relevant section.
- Inner components (`PaywallModal`, `StatCard`, menu editor sections) are defined inline — keep this pattern.
- The `userTier` state mock defaults to `UserTier.FREE`; toggling it simulates the Plus upgrade flow.

---

## Data Access Patterns

| Goal | How |
|---|---|
| Read menu | `dataService.getMenu()` → `Category[]` |
| Save menu changes | `dataService.saveMenu(categories)` |
| Record a watch session | `dataService.recordWatchSession(session)` |
| Record an order | `dataService.recordOrder(order)` |
| Get aggregated analytics | `dataService.getAggregatedMetrics(timeWindow)` |

**Do not read `localStorage` directly** — always go through `dataService`.

---

## Testing Considerations

- `dataService` is a module singleton backed by `localStorage`.
- In test environments, mock `localStorage` or call a reset method before each test to avoid state bleed.
- Gemini calls should be mocked in tests (check for missing `API_KEY` or mock `@google/genai`).

---

## Out-of-Scope for Agents (Do Not Change Without Discussion)

| Rule | Reason |
|---|---|
| 10-item dish limit in `CustomerApp` | Hard product requirement |
| Mock auth pattern (`mm_auth` in localStorage) | No real backend; changing breaks logout flow |
| Dark monochrome Tailwind palette | Brand constraint |
| `gemini-2.5-flash` model name | Pinned for cost/speed; update only when explicitly asked |

---

## Suggested Next Features (Safe to Implement)

- [ ] **Search/filter** on the customer reel view
- [ ] **Dish category tabs** persistent scroll position
- [ ] **Order history page** for owners using `dataService.getOrders()`
- [ ] **`generateMarketingCopy`** integration into the menu editor UI (function exists but is unused in UI)
- [ ] **Export analytics as CSV** (Plus tier — use `PaywallModal` gate)
- [ ] **Dark/light theme toggle** (currently hard-coded dark)
