
// ── Supabase-backed types ──────────────────────────────────────
export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  currency: string; // ISO 4217 currency code (e.g., "USD", "INR", "GBP")
  created_at: string;
}

// Public-facing restaurant info (no owner details)
export interface RestaurantPublic {
  id: string;
  name: string;
  slug: string;
  currency: string;
}

// ── App domain types ─────────────────────────────────────────
export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  videoUrl: string;
  category: string;
  categoryTitle?: string;
  ingredients?: string;
  benefits?: string;
  calories?: number;
  popularityScore: number; // 0-100
  prepTime: number; // minutes
  stockQuantity?: number; // max orderable units per day (undefined = unlimited)
  manualSoldOut?: boolean; // owner can force sold-out at any time
  mediaTransform?: {
    x: number; // percentage
    y: number; // percentage
    scale: number; // 1-3
  };
}

export interface Category {
  id: string;
  title: string;
  items: Dish[];
}

export interface OrderItem {
  dishId: string;
  quantity: number;
  name: string;
  price: number;
  /** GST rate applied to this line (e.g. 0.05 for 5% Indian restaurant GST). */
  gstRate?: number;
  /** Total GST for this line (unit price × qty × gstRate). */
  gstAmount?: number;
  /** Line total including GST. */
  lineTotal?: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  /** Pre-tax subtotal (ex-GST menu prices). */
  subtotalAmount?: number;
  /** Total GST charged on the order. */
  gstAmount?: number;
  timestamp: number;
  timeToOrder: number; // seconds from app open to checkout
}

export interface AnalyticsMetric {
  timestamp: string;
  views: number;
  orders: number;
  avgTimeOnPage: number;
}

export interface DishPerformance {
  id: string;
  name: string;
  views: number;
  conversions: number;
  conversionRate: number;
  watchTime: number;
}

export enum AppMode {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  CUSTOMER = 'CUSTOMER',
  OWNER = 'OWNER'
}

export enum UserTier {
  FREE = 'FREE',
  PLUS = 'PLUS'
}

export interface WatchSession {
  reelId: string;
  startTime: number;
  duration: number;
  completed: boolean;
  timestamp: number;
}

// ─── Subscription Feature Types ───────────────────────────────────────────────

export type TimeSlot = '08-09' | '12-14' | '19-21';
export type SubDeliveryType = 'delivery' | 'pickup';
export type DeliveryFeeMode = 'upfront' | 'cash_on_delivery';
export type SubStatus = 'active' | 'paused' | 'cancelled';
export type DailyOrderStatus = 'pending' | 'delivered' | 'cancelled' | 'skipped';
export type TicketReason =
  | 'not_received'
  | 'wrong_item'
  | 'partial_delivery'
  | 'damaged'
  | 'late_delivery'
  | 'other';
export type TicketStatus = 'open' | 'investigating' | 'resolved';
export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'processed';

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  '08-09': '8:00 AM – 9:00 AM',
  '12-14': '12:00 PM – 2:00 PM',
  '19-21': '7:00 PM – 9:00 PM',
};

export const TICKET_REASON_LABELS: Record<TicketReason, string> = {
  not_received: 'Item not received',
  wrong_item: 'Wrong item delivered',
  partial_delivery: 'Partial delivery',
  damaged: 'Item damaged',
  late_delivery: 'Delivered late (after slot)',
  other: 'Other',
};

export interface MealPlan {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  priceMonthly: number;
  deliveryFee: number;
  isActive: boolean;
  dishIds: string[];
  createdAt: string;
}

// ─── Menu Costing Types ───────────────────────────────────────────────────────

export type PurchaseUnit = 'kg' | 'g' | 'l' | 'ml' | 'piece';

export interface RestaurantOverhead {
  id?: string;
  restaurantId: string;
  month: string; // YYYY-MM-DD (first of month)
  rent: number;
  wages: number;
  electricity: number;
  gas: number;
  internet: number;
  packing: number;
  other: number;
  expectedOrders?: number | null;
}

export interface InvoiceLineItem {
  name: string;
  quantity: number;
  unit: PurchaseUnit;
  amount: number;
}

export interface IngredientInvoice {
  id: string;
  restaurantId: string;
  month: string;
  fileUrl?: string | null;
  fileName?: string | null;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
  createdAt: string;
}

export type IngredientSource = 'invoice' | 'manual';

export interface Ingredient {
  id: string;
  restaurantId: string;
  name: string;
  purchaseUnit: PurchaseUnit;
  purchaseQuantity: number;
  purchaseAmount: number;
  unitCost: number; // per base unit (gram/ml/piece)
  source: IngredientSource; // 'invoice' from uploaded bills, 'manual' for cash purchases
  sourceInvoiceId?: string | null;
}

export interface DishRecipeLine {
  id: string;
  dishId: string;
  ingredientId: string;
  ingredientName?: string;
  unitCost?: number;
  quantity: number; // per plate, in ingredient base unit
}

export interface CustomerSubscription {
  id: string;
  restaurantId: string;
  planId: string;
  planName: string;
  customerName: string;
  phone: string;
  email?: string;
  deliveryType: SubDeliveryType;
  deliveryFeeMode: DeliveryFeeMode;
  timeSlot: TimeSlot;
  status: SubStatus;
  pauseUntil?: string;
  pausedDaysUsed: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  rotationDishIds?: string[];
}

export interface DailyOrder {
  id: string;
  subscriptionId: string;
  restaurantId: string;
  deliveryDate: string;
  dishId?: string;
  dishName: string;
  status: DailyOrderStatus;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryTicket {
  id: string;
  subscriptionId: string;
  dailyOrderId: string;
  restaurantId: string;
  reason: TicketReason;
  notes?: string;
  status: TicketStatus;
  createdAt: string;
  adjustments?: DeliveryAdjustment[];
}

export interface DeliveryAdjustment {
  id: string;
  ticketId: string;
  notes: string;
  createdAt: string;
}

export interface RefundRequest {
  id: string;
  subscriptionId: string;
  restaurantId: string;
  reason: string;
  amount: number;
  status: RefundStatus;
  restaurantNotes?: string;
  createdAt: string;
  processedAt?: string;
}

export interface CustomerDirectoryEntry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  planName: string;
  subStatus: SubStatus;
  totalOrders: number;
  deliveredOrders: number;
  lastActiveDate: string | null;
  joinedAt: string;
}

// ─── Analytics Report ─────────────────────────────────────────────────────────

export interface AnalyticsReport {
  period: '24h' | '7d' | '30d';
  generatedAt: string;
  currency: string;
  revenue: {
    total: number;
    avgOrderValue: number;
    orderCount: number;
    topDishRevenue: Array<{ name: string; revenue: number; units: number }>;
  };
  engagement: {
    totalViews: number;
    engagementRate: number;     // % views > 5s
    avgWatchDuration: number;   // seconds
    completionRate: number;     // % completed reels
    topDishes: Array<{ name: string; views: number; conversionRate: number }>;
    lowConversionDishes: Array<{ name: string; views: number; conversionRate: number }>;
  };
  subscriptions: {
    active: number;
    paused: number;
    cancelled: number;
    totalOrders: number;
    deliveredOrders: number;
    deliveryRate: number;       // %
    planBreakdown: Array<{ planName: string; count: number; monthlyRevenue: number }>;
  };
  customers: {
    total: number;
    newThisPeriod: number;
  };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AggregatedMetrics {
  totalViews: number;
  totalWatchTime: number; // seconds
  avgWatchDuration: number; // seconds
  completionRate: number; // percentage
  mostPopularDishId: string;
  engagementRate: number;

  // Sales Metrics
  totalOrders: number;
  avgOrderTime: number; // seconds
  conversionRate: number; // percentage

  // Graph Data
  hourlyTraffic: { hour: string; views: number }[];
  conversionFunnel: { stage: string; count: number; fill: string }[];
  dishPerformance: DishPerformance[];
}

// ─── Customer Profile ─────────────────────────────────────────────────────────

export interface CustomerProfile {
  id: string;
  userId: string;
  email: string;
  emailVerified: boolean;
  phone?: string;
  name?: string;
  // Address fields
  addressLine1?: string;   // apartment/building name, house number
  addressLine2?: string;   // plot/flat number
  street?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  // Google Maps location
  lat?: number;
  lng?: number;
  formattedAddress?: string;  // full address from Google Places
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  addressLine1?: string;
  addressLine2?: string;
  street?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
}