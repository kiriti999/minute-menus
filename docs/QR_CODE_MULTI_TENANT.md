# QR Code Multi-Tenant System — Architecture Plan

> Restaurant-specific URL routing, QR code generation, and customer ordering flow

---

## 1. Current State Analysis

### Existing Infrastructure ✅
| Component | Status | Notes |
|-----------|--------|-------|
| `restaurants.slug` | ✅ Exists | Unique slug field in Supabase schema |
| `restaurant_id` on orders | ✅ Exists | Orders already linked to restaurants |
| `supabaseService.getMenu(restaurantId)` | ✅ Exists | Can fetch menu by restaurant ID |
| Multi-tenant RLS policies | ✅ Exists | Row-level security configured |

### Missing Components 🔴
| Component | Priority | Description |
|-----------|----------|-------------|
| URL routing by slug | P0 | `/restaurant-slug` → CustomerApp with context |
| QR code generation | P0 | Generate downloadable QR in Owner Dashboard |
| Restaurant context in CustomerApp | P0 | Load menu from correct restaurant |
| Order notifications | P1 | Email (nodemailer) + SMS (Twilio) |

---

## 2. URL Structure Decision

### Option A: Path-based (Recommended for MVP)
```
https://minutemenus.com/fresh-fusion
https://localhost:3000/fresh-fusion
```

**Pros:**
- Works without DNS configuration
- Simple Vite routing (no wildcard subdomains)
- Easy local development
- Single SSL certificate

### Option B: Subdomain-based (Production scale)
```
https://fresh-fusion.minutemenus.com
```

**Pros:**
- Better brand isolation
- Cookie isolation per restaurant
- Industry standard for multi-tenant SaaS

**Recommendation:** Start with **path-based** for MVP, add subdomain support later via Cloudflare Workers or Nginx proxy.

---

## 3. Implementation Architecture

### 3.1 URL Routing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      URL Access                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
               ┌──────────────────────────┐
               │  App.tsx Router Logic    │
               └──────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   /fresh-fusion         /dashboard             /
   (restaurant slug)     (owner mode)        (landing)
        │                     │                     │
        ▼                     ▼                     ▼
   CustomerApp           OwnerDashboard        Landing
   (restaurantSlug       (authenticated)       Page
    from URL)
```

### 3.2 Component Updates

#### App.tsx Changes
```tsx
// New state and routing logic
const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);

useEffect(() => {
  const path = window.location.pathname;
  const slugMatch = path.match(/^\/([a-z0-9-]+)$/i);
  
  if (slugMatch && slugMatch[1] !== 'dashboard' && slugMatch[1] !== 'login') {
    // Customer accessing restaurant via QR
    setRestaurantSlug(slugMatch[1]);
    setMode(AppMode.CUSTOMER);
  }
}, []);
```

#### CustomerApp Changes
```tsx
interface CustomerAppProps {
  onNavigateToDashboard: () => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  restaurantSlug?: string; // NEW: When accessed via QR code
}

// Load menu from Supabase using slug
useEffect(() => {
  if (restaurantSlug) {
    loadRestaurantBySlug(restaurantSlug);
  }
}, [restaurantSlug]);
```

### 3.3 QR Code Generation

#### Owner Dashboard — QR Section
```tsx
// New component in OwnerDashboard.tsx
const QRCodeSection = () => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [restaurantSlug, setRestaurantSlug] = useState<string>('');

  useEffect(() => {
    // Fetch current restaurant slug from Supabase
    fetchRestaurantSlug().then(slug => {
      setRestaurantSlug(slug);
      const baseUrl = window.location.origin;
      setQrUrl(`${baseUrl}/${slug}`);
    });
  }, []);

  return (
    <div className="bg-zinc-900 p-6 rounded-lg">
      <h3>Your Restaurant QR Code</h3>
      <QRCodeSVG value={qrUrl} size={200} />
      <p className="text-zinc-400">{qrUrl}</p>
      <button onClick={downloadQR}>Download PNG</button>
      <button onClick={downloadSVG}>Download SVG</button>
    </div>
  );
};
```

#### Library: `qrcode.react`
```bash
pnpm add qrcode.react
```

### 3.4 Database Schema Updates

```sql
-- Add notification preferences to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS
  notification_email text;

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS
  notification_phone text;

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS
  notifications_enabled boolean DEFAULT true;

-- Function to lookup restaurant by slug (for public access)
CREATE OR REPLACE FUNCTION get_restaurant_by_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.name, r.slug
  FROM restaurants r
  WHERE r.slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Customer Ordering Flow

### 4.1 Sequence Diagram

```
Customer          Frontend           Supabase         Owner
   │                 │                  │               │
   │ Scan QR Code    │                  │               │
   │────────────────>│                  │               │
   │                 │ /fresh-fusion    │               │
   │                 │──────────────────>│              │
   │                 │  get_restaurant_by_slug          │
   │                 │<──────────────────│              │
   │                 │ {id, name, menu}  │              │
   │  Display Menu   │                  │               │
   │<────────────────│                  │               │
   │                 │                  │               │
   │ Add to Cart     │                  │               │
   │────────────────>│                  │               │
   │                 │                  │               │
   │ Place Order     │                  │               │
   │────────────────>│                  │               │
   │                 │ INSERT orders    │               │
   │                 │──────────────────>│              │
   │                 │                  │  Trigger      │
   │                 │                  │───────────────>│
   │                 │                  │  Email + SMS  │
   │                 │                  │               │
```

### 4.2 SupabaseService Updates

```typescript
// New method: Get restaurant by slug (for customers)
async getRestaurantBySlug(slug: string): Promise<{
  id: string;
  name: string;
  slug: string;
} | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();
  
  if (error) return null;
  return data;
}

// Modified: Get menu for public access (no auth required)
async getPublicMenu(restaurantId: string): Promise<Category[]> {
  // Uses existing getMenu() but with explicit restaurantId
  return this.getMenu(restaurantId);
}
```

---

## 5. Order Notifications (Phase 2)

### 5.1 Architecture

Since this is a frontend-only React app, notifications require a backend:

**Option A: Supabase Edge Functions (Recommended)**
```
Order Insert → Supabase Trigger → Edge Function → Email/SMS
```

**Option B: Separate Node.js Backend**
```
Order Insert → Webhook → Node.js Server → Nodemailer/Twilio
```

### 5.2 Supabase Edge Function Example

```typescript
// supabase/functions/order-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { record } = await req.json(); // New order
  
  // Get restaurant owner details
  const restaurant = await getRestaurant(record.restaurant_id);
  
  // Send email via Resend/SendGrid (simpler than nodemailer for serverless)
  await sendEmail({
    to: restaurant.notification_email,
    subject: `New Order #${record.id.slice(0, 8)}`,
    body: formatOrderEmail(record),
  });
  
  // Send SMS via Twilio
  await sendSMS({
    to: restaurant.notification_phone,
    body: `New order received! Total: $${record.total_amount}`,
  });
  
  return new Response('OK');
});
```

### 5.3 Database Trigger

```sql
-- Trigger to call edge function on new order
CREATE OR REPLACE FUNCTION notify_order()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/order-notification',
    body := json_build_object('record', NEW)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_created
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order();
```

---

## 6. Implementation Phases

### Phase 1: Core QR Flow (MVP) — ✅ COMPLETED
- [x] Add URL routing in App.tsx for `/:slug` paths
- [x] Update CustomerApp to accept `restaurantSlug` prop
- [x] Add `getRestaurantBySlug()` to supabaseService
- [x] Load menu and submit orders with restaurant context
- [x] Add QR code generation to Owner Dashboard

### Phase 2: QR Customization — 1-2 hours
- [ ] Custom QR code colors/logo
- [ ] Download as PNG/SVG/PDF
- [ ] Print-ready templates (table tents, posters)

### Phase 3: Slug Management — 1 hour
- [ ] Allow owners to customize their slug
- [ ] Slug validation (unique, URL-safe)
- [ ] Redirect old slugs (optional)

### Phase 4: Order Notifications — 2-3 hours
- [ ] Supabase Edge Function for notifications
- [ ] Email integration (Resend recommended over nodemailer)
- [ ] Twilio SMS integration
- [ ] Notification preferences in Owner Dashboard

### Phase 5: POS Integration (Future)
- [ ] Real-time order updates via Supabase Realtime
- [ ] POS-style order management screen
- [ ] Order status updates (pending → preparing → ready)

---

## 7. File Changes Summary (Phase 1 Completed)

| File | Changes |
|------|---------|
| `App.tsx` | ✅ URL routing for `/:slug`, restaurant context state, passes props to CustomerApp |
| `pages/CustomerApp.tsx` | ✅ Accepts `restaurantSlug/Id/Name`, loads menu by ID, shows restaurant branding |
| `pages/OwnerDashboard.tsx` | ✅ QR code modal with `qrcode.react`, downloads PNG/SVG, "Get QR Code" button |
| `services/supabaseService.ts` | ✅ `getRestaurantBySlug()`, `getRestaurantDetails()`, `updateRestaurantSlug()` |
| `types.ts` | ✅ Added `RestaurantPublic` interface |
| `package.json` | ✅ Added `qrcode.react` dependency |
| `supabase/schema.sql` | Pending: notification columns |
| `supabase/functions/` | Pending: order notification edge function |

---

## 8. Testing Checklist

- [x] Customer can access `/restaurant-slug` and see menu (requires valid slug in DB)
- [x] Customer can place order (writes to correct restaurant via restaurantId)
- [x] Owner can generate and download QR code (PNG/SVG)
- [x] QR code encodes correct URL (`http://localhost:3000/<slug>`)
- [ ] 404 page for invalid slugs ✅ (shows "Restaurant Not Found" with Go Home button)
- [ ] Order notifications received (email + SMS) — Phase 4

---

*Architecture v1.0 | March 2026*
