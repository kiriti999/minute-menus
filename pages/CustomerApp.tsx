import {
  AlertTriangle,
  Bookmark,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  MapPin,
  Minus,
  Moon,
  Pause,
  Phone,
  Play,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sun,
  Tag,
  User,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateTermMealPlanTax,
  calculateOrderTax,
  enrichOrderItemsWithGst,
  formatPriceInCurrency,
  INDIAN_RESTAURANT_GST_PERCENT,
  isIndianGstApplicable,
} from "@minute-menus/currency";
import { isDishSoldOut, MenuGridCard, MenuListCard } from "@minute-menus/reels";
import { supabaseService } from "../services/supabaseService";
import { supabase } from "../lib/supabase";
import { brandInitials } from "../lib/brandInitials";
import { formatDisplayName } from "../lib/formatDisplayName";
import { openRazorpayCheckout } from "../lib/loadRazorpayCheckout";
import { PAYMENT_API_PATHS } from "../lib/api/paymentRouteRewrites";
import { ButtonSpinner } from "@minute-menus/ui";
import { getErrorMessage } from "@minute-menus/errors";
import { CUSTOMER_STATUS_COPY, isOrderInFlight } from "../components/orderStatus";
import { LiveOrderTracker } from "../components/LiveOrderTracker";
import type { Category, CustomerAddress, CustomerOrder, CustomerProfile, CustomerSubscription, DailyOrder, Dish, MealPlan, MealSlot, OrderItem, SubDeliveryType, DeliveryFeeMode, TicketReason, WeeklyOperatingHours, RestaurantAvailability } from "@minute-menus/types";
import {
  getAvailabilityStatus,
  getMealPlanPricingOption,
  MEAL_SLOT_LABELS,
  MEAL_SLOT_TIME_SLOTS,
  MEAL_SLOTS_BY_COUNT,
  TICKET_REASON_LABELS,
  TIME_SLOT_LABELS,
} from "@minute-menus/types";
import { CustomerAddressLocate } from "../components/CustomerAddressLocate";

interface CustomerAppProps {
  onNavigateToDashboard: () => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  // Restaurant context from QR code flow
  restaurantSlug?: string | null;
  restaurantId?: string | null;
  restaurantName?: string | null;
  currency?: string;
  timezone: string;
  deliveryEnabled: boolean;
  operatingHours: WeeklyOperatingHours;
}

function formatDeliveryAddress(profile: CustomerProfile): string {
  if (profile.formattedAddress?.trim()) return profile.formattedAddress.trim();
  return [
    profile.addressLine1,
    profile.addressLine2,
    profile.street,
    profile.area,
    profile.landmark ? `Near ${profile.landmark}` : undefined,
    [profile.city, profile.state].filter(Boolean).join(", "),
    profile.pincode,
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
}

/** Delivery is Hyderabad-area only — state is fixed in the address form. */
const DEFAULT_DELIVERY_STATE = "Telangana";
const CUSTOMER_PHONE_OTP_ENABLED = import.meta.env.VITE_CUSTOMER_PHONE_OTP_ENABLED !== "false";

function deliveryDetailsError(fields: {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  street: string;
  area: string;
  city: string;
  pincode: string;
}): string | null {
  const checks: Array<[string, string]> = [
    [fields.name, "Please enter your name."],
    [fields.phone, "Please enter your phone number."],
    [fields.addressLine1, "Please enter your building/house name."],
    [fields.addressLine2, "Please enter your flat/plot number."],
    [fields.street, "Please enter your street."],
    [fields.area, "Please enter your area / locality."],
    [fields.city, "Please enter your city."],
    [fields.pincode, "Please enter your pincode."],
  ];
  for (const [value, message] of checks) {
    if (!value.trim()) return message;
  }
  return null;
}

export const CustomerApp: React.FC<CustomerAppProps> = ({
  onNavigateToDashboard,
  isDarkTheme,
  onToggleTheme,
  restaurantSlug,
  restaurantId,
  restaurantName,
  currency = "USD",
  timezone,
  deliveryEnabled,
  operatingHours,
}) => {
  const [availabilityTick, setAvailabilityTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setAvailabilityTick((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const availability = useMemo<RestaurantAvailability>(
    () => ({ timezone, deliveryEnabled, operatingHours }),
    [timezone, deliveryEnabled, operatingHours],
  );
  const orderingStatus = useMemo(() => getAvailabilityStatus(availability), [availability, availabilityTick]);
  // ── Cart (persisted to localStorage so it survives OAuth/refresh) ──────────
  const CART_KEY = `mm_cart_${restaurantId ?? "default"}`;
  const loadCart = (): OrderItem[] => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    } catch {
      return [];
    }
  };
  const [cart, setCart] = useState<OrderItem[]>(loadCart);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, CART_KEY]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeDishIndex, setActiveDishIndex] = useState(0);
  const [isOrdering, setIsOrdering] = useState(false);
  const [soldCounts, setSoldCounts] = useState<Record<string, number>>({});

  // ── Customer Auth & Profile (required before checkout) ─────────────────────
  type AuthStep = "auth" | "otp" | "details";
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [myOrders, setMyOrders] = useState<CustomerOrder[]>([]);
  const [orderToast, setOrderToast] = useState("");
  const lastOrderStatusRef = useRef<Map<string, string>>(new Map());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>("auth");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [addressActionError, setAddressActionError] = useState("");
  // Auth step fields
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  // OTP step fields
  const [otpCode, setOtpCode] = useState("");
  // Details step fields
  const [detailsName, setDetailsName] = useState("");
  const [detailsPhone, setDetailsPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [detailsAddressLine1, setDetailsAddressLine1] = useState("");
  const [detailsAddressLine2, setDetailsAddressLine2] = useState("");
  const [detailsStreet, setDetailsStreet] = useState("");
  const [detailsArea, setDetailsArea] = useState("");
  const [detailsLandmark, setDetailsLandmark] = useState("");
  const [detailsCity, setDetailsCity] = useState("");
  const [detailsState, setDetailsState] = useState(DEFAULT_DELIVERY_STATE);
  const [detailsPincode, setDetailsPincode] = useState("");
  const [detailsLat, setDetailsLat] = useState<number | undefined>();
  const [detailsLng, setDetailsLng] = useState<number | undefined>();
  const [detailsFormattedAddress, setDetailsFormattedAddress] = useState("");
  /** `edit` = change address from cart (no payment); `checkout` = fill then pay. */
  const [detailsPurpose, setDetailsPurpose] = useState<"checkout" | "edit">("checkout");
  // ──────────────────────────────────────────────────────────────────────────

  // ── Subscription state ──────────────────────────────────────────────
  type SubView = "lookup" | "plans" | "manage";
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [subView, setSubView] = useState<SubView>("lookup");
  const [subPhone, setSubPhone] = useState("");
  const [subName, setSubName] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subDeliveryType, setSubDeliveryType] = useState<SubDeliveryType>("delivery");
  const [subDeliveryFeeMode, setSubDeliveryFeeMode] = useState<DeliveryFeeMode>("cash_on_delivery");
  const [availablePlans, setAvailablePlans] = useState<MealPlan[]>([]);
  const [selectedDurationDays, setSelectedDurationDays] = useState(28);
  const [selectedMealsPerDay, setSelectedMealsPerDay] = useState(1);
  const [customerSub, setCustomerSub] = useState<CustomerSubscription | null>(null);
  const [planDishes, setPlanDishes] = useState<Dish[]>([]);
  const [dailyOrders, setDailyOrders] = useState<DailyOrder[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");
  const [pauseUntil, setPauseUntil] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [ticketNotes, setTicketNotes] = useState("");
  const [ticketReason, setTicketReason] = useState<TicketReason>("not_received");
  // Meal plan modal (dish-select → subscribe flow)
  const [isMealPlanModalOpen, setIsMealPlanModalOpen] = useState(false);
  const [modalPlan, setModalPlan] = useState<MealPlan | null>(null);
  const [mealRotations, setMealRotations] = useState<Partial<Record<MealSlot, string[]>>>({});
  const [editingMealSlot, setEditingMealSlot] = useState<MealSlot>("lunch");
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  // Per-day schedule override date (manage view)
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(
    () => new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  // ────────────────────────────────────────────────────────────────────

  // Tracking "Time to Order"
  const [sessionStartTime] = useState<number>(Date.now());

  // Load menu from Supabase (using restaurantId if provided via QR code)
  const [menuCategories, setMenuCategories] = useState<Category[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  // Disable browser scroll restoration to prevent jumping to last position
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    setMenuLoading(true);
    Promise.all([
      supabaseService.getMenu(restaurantId ?? undefined),
      supabaseService.getDishSoldCounts(restaurantId ?? undefined).catch(() => ({})),
      restaurantId ? supabaseService.getMealPlans(restaurantId).catch(() => []) : Promise.resolve([]),
    ])
      .then(([menu, counts, plans]) => {
        setMenuCategories(menu);
        setSoldCounts(counts);
        setAvailablePlans((plans as MealPlan[]).filter((p) => p.isActive));
      })
      .catch(console.error)
      .finally(() => setMenuLoading(false));
  }, [restaurantId]);

  // Check if customer is logged in on mount and handle OAuth callbacks
  useEffect(() => {
    const loadProfile = async () => {
      const profile = await supabaseService.ensureCustomerProfile();
      setCustomerProfile(profile);
      if (profile) {
        setDetailsName(profile.name ?? "");
        setDetailsPhone(profile.phone ?? "");
        setVerifiedPhone(profile.phoneVerified ? profile.phone ?? "" : "");
        setDetailsAddressLine1(profile.addressLine1 ?? "");
        setDetailsAddressLine2(profile.addressLine2 ?? "");
        setDetailsStreet(profile.street ?? "");
        setDetailsArea(profile.area ?? "");
        setDetailsLandmark(profile.landmark ?? "");
        setDetailsCity(profile.city ?? "");
        setDetailsState(DEFAULT_DELIVERY_STATE);
        setDetailsPincode(profile.pincode ?? "");
        // If profile incomplete and auth modal is not open, open it at details step
        if (!supabaseService.isProfileComplete(profile) && isAuthModalOpen) {
          setAuthStep("details");
        }
      }
    };

    loadProfile().catch(() => { /* not logged in */ });

    // Listen for auth state changes (handles OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        loadProfile().catch(console.error);
      } else if (event === "SIGNED_OUT") {
        setCustomerProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [isAuthModalOpen]);

  // Poll the customer's orders (fast while an order is in flight) to drive the live
  // header tracker and announce status changes with a toast.
  const activeOrders = myOrders.filter((order) => isOrderInFlight(order.status));
  const hasActiveOrder = activeOrders.length > 0;
  useEffect(() => {
    if (!customerProfile) {
      setMyOrders([]);
      lastOrderStatusRef.current = new Map();
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const orders = await supabaseService.getMyOrders();
        if (cancelled) return;
        const previous = lastOrderStatusRef.current;
        const changed = orders.find((order) => previous.has(order.id) && previous.get(order.id) !== order.status);
        if (changed) {
          setOrderToast(`${changed.restaurantName}: ${CUSTOMER_STATUS_COPY[changed.status].message}`);
        }
        lastOrderStatusRef.current = new Map(orders.map((order) => [order.id, order.status]));
        setMyOrders(orders);
      } catch (error) {
        if (!cancelled) console.error("Could not load orders", error);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), hasActiveOrder ? 10_000 : 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [customerProfile?.userId, hasActiveOrder]);

  useEffect(() => {
    if (!orderToast) return;
    const timer = window.setTimeout(() => setOrderToast(""), 8000);
    return () => window.clearTimeout(timer);
  }, [orderToast]);

  // Product limit removed for multi-category restaurant menus — show all categories.
  const displayCategories = useMemo(
    () =>
      menuCategories
        .map((category) => ({
          ...category,
          items: category.items.filter((dish) => dish.isActive !== false),
        }))
        .filter((category) => category.items.length > 0),
    [menuCategories],
  );

  const flatDishes = useMemo(
    () => displayCategories.flatMap((cat) => cat.items),
    [displayCategories],
  );

  // Map dishId → plan for subscription bands on reel cards
  const dishPlanMap = useMemo(() => {
    const map: Record<string, MealPlan> = {};
    availablePlans.forEach(plan => {
      plan.dishIds.forEach(id => { map[id] = plan; });
    });
    return map;
  }, [availablePlans]);

  // Dishes available in the modal plan (for rotation selection)
  const modalPlanDishes = useMemo(() => {
    if (!modalPlan) return [];
    return menuCategories.flatMap(c => c.items).filter(d => modalPlan.dishIds.includes(d.id));
  }, [modalPlan, menuCategories]);

  // One id per menu visit so analytics can count real visits, not estimates.
  const [visitId] = useState(() => crypto.randomUUID());
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const scrollLockRef = useRef(false);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  const activeCategory = useMemo(
    () => displayCategories.find((cat) => cat.id === activeCategoryId) ?? displayCategories[0] ?? null,
    [displayCategories, activeCategoryId],
  );

  useEffect(() => {
    if (displayCategories.length === 0) return;
    setActiveCategoryId((prev) =>
      prev && displayCategories.some((cat) => cat.id === prev) ? prev : displayCategories[0].id,
    );
  }, [displayCategories]);

  const getCategoryAnchorY = (): number =>
    (categoryNavRef.current?.getBoundingClientRect().bottom ?? 140) + 4;

  const scrollToCategory = (catId: string) => {
    const container = containerRef.current;
    const section = document.getElementById(`menu-cat-${catId}`);
    if (!container || !section) return;

    scrollLockRef.current = true;
    setActiveCategoryId(catId);
    setCategoryMenuOpen(false);
    const delta = section.getBoundingClientRect().top - getCategoryAnchorY();
    container.scrollBy({ top: delta, behavior: "smooth" });
    window.setTimeout(() => {
      scrollLockRef.current = false;
    }, 500);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || displayCategories.length === 0 || menuLoading) return;

    const updateActiveCategory = () => {
      if (scrollLockRef.current) return;

      const anchorY = getCategoryAnchorY();
      let nextId = displayCategories[0].id;
      let closestTop = Number.NEGATIVE_INFINITY;

      for (const cat of displayCategories) {
        const section = document.getElementById(`menu-cat-${cat.id}`);
        if (!section) continue;
        const top = section.getBoundingClientRect().top;
        if (top <= anchorY && top > closestTop) {
          closestTop = top;
          nextId = cat.id;
        }
      }

      const atBottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight - 8;
      if (atBottom) {
        nextId = displayCategories[displayCategories.length - 1].id;
      }

      setActiveCategoryId(nextId);
    };

    updateActiveCategory();
    container.addEventListener("scroll", updateActiveCategory, { passive: true });
    window.addEventListener("resize", updateActiveCategory);
    return () => {
      container.removeEventListener("scroll", updateActiveCategory);
      window.removeEventListener("resize", updateActiveCategory);
    };
  }, [displayCategories, menuLoading]);

  useEffect(() => {
    if (!categoryMenuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (categoryNavRef.current?.contains(event.target as Node)) return;
      setCategoryMenuOpen(false);
    };
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, [categoryMenuOpen]);

  // Scroll to first item on load to ensure proper initial position
  useEffect(() => {
    if (containerRef.current && flatDishes.length > 0) {
      // Reset scroll to top on mount/menu load
      containerRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [flatDishes.length]);

  // --- Eye Tracking Logic ---
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!containerRef.current || flatDishes.length === 0) return;

    const seen = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) return;
          const dishId = entry.target.getAttribute("data-dish-id");
          const index = flatDishes.findIndex((d) => d.id === dishId);
          if (index >= 0 && !seen.has(index)) {
            seen.add(index);
            setActiveDishIndex(index);
          }
        });
      },
      { root: containerRef.current, threshold: [0.55, 0.75] },
    );

    containerRef.current.querySelectorAll("[data-dish-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [flatDishes]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    return () => recordSession(activeDishIndex);
  }, [activeDishIndex]);

  const recordSession = (index: number) => {
    const durationMs = Date.now() - startTimeRef.current;
    const durationSec = durationMs / 1000;

    // Only record significant views (> 1 second)
    if (durationSec > 1 && flatDishes[index]) {
      const dish = flatDishes[index];
      // Assume "completed" if watched > 5 seconds (simplified metric)
      const isCompleted = durationSec > 5;

      supabaseService.recordWatchSession(
        {
          reelId: dish.id,
          startTime: startTimeRef.current,
          duration: durationSec,
          completed: isCompleted,
          timestamp: Date.now(),
          visitId,
        },
        restaurantId ?? undefined,
      );
    }
  };
  // ---------------------------

  const handleAddToOrder = (dish: Dish, variantId?: string) => {
    if (dish.manualSoldOut || !orderingStatus.open) {
      if (!orderingStatus.open) alert(orderingStatus.message);
      return;
    }
    // Cart key is dishId + optional variantId so different sizes are separate lines
    const cartKey = variantId ? `${dish.id}__${variantId}` : dish.id;
    const currentCartQty = cart.find((i) => i.dishId === cartKey)?.quantity ?? 0;
    const soldQty = soldCounts[dish.id] ?? 0;
    if (
      dish.stockQuantity != null &&
      currentCartQty + soldQty >= dish.stockQuantity
    ) {
      return; // already at or over limit
    }

    // Resolve variant price and discount
    const activeVariant = variantId ? dish.variants?.find((v) => v.id === variantId) : undefined;
    const basePrice = activeVariant ? activeVariant.price : dish.price;
    // Import getEffectivePrice/resolveDiscountPercent inline to keep CustomerApp self-contained
    const catDiscount = displayCategories.find((c) => c.items.some((d) => d.id === dish.id))?.discountPercent ?? 0;
    const discPct = (dish.discountPercent && dish.discountPercent > 0) ? dish.discountPercent : catDiscount;
    const effectivePrice = discPct > 0 ? Math.round(basePrice * (1 - discPct / 100) * 100) / 100 : basePrice;

    setCart((prev) => {
      const existing = prev.find((i) => i.dishId === cartKey);
      if (existing) {
        return prev.map((i) =>
          i.dishId === cartKey ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          dishId: cartKey,
          quantity: 1,
          name: dish.name,
          price: effectivePrice,
          variantId,
          variantName: activeVariant?.name,
        },
      ];
    });
  };

  const updateQuantity = (dishId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.dishId === dishId) {
            return { ...item, quantity: Math.max(0, item.quantity + delta) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const fillDetailsFromProfile = (profile: CustomerProfile) => {
    setDetailsName(profile.name ?? "");
    setDetailsPhone(profile.phone ?? "");
    setVerifiedPhone(profile.phoneVerified ? profile.phone ?? "" : "");
    setPhoneOtpSent(false);
    setPhoneOtpCode("");
    setDetailsAddressLine1(profile.addressLine1 ?? "");
    setDetailsAddressLine2(profile.addressLine2 ?? "");
    setDetailsStreet(profile.street ?? "");
    setDetailsArea(profile.area ?? "");
    setDetailsLandmark(profile.landmark ?? "");
    setDetailsCity(profile.city ?? "");
    setDetailsState(DEFAULT_DELIVERY_STATE);
    setDetailsPincode(profile.pincode ?? "");
    setDetailsLat(profile.lat);
    setDetailsLng(profile.lng);
    setDetailsFormattedAddress(profile.formattedAddress ?? "");
  };

  /** Google locate fills area, city, pincode; building/flat/street stay manual. */
  const applyLocatedAddress = (address: CustomerAddress) => {
    if (address.area) setDetailsArea(address.area);
    if (address.city) setDetailsCity(address.city);
    if (address.pincode) setDetailsPincode(address.pincode);
    setDetailsState(DEFAULT_DELIVERY_STATE);
    setDetailsLat(address.lat);
    setDetailsLng(address.lng);
    setAuthError("");
  };

  const openDeliveryDetails = (purpose: "checkout" | "edit", profile?: CustomerProfile | null) => {
    setDetailsPurpose(purpose);
    if (profile) fillDetailsFromProfile(profile);
    setAuthStep("details");
    setAuthError("");
    setIsAuthModalOpen(true);
  };

  const handleAddAddress = async () => {
    setAddressActionError("");
    setDetailsPurpose("checkout");
    setAuthError("");
    setIsAuthModalOpen(true);
    if (customerProfile) {
      fillDetailsFromProfile(customerProfile);
      setAuthStep("details");
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      const user = session?.user;
      if (!user) {
        setAuthStep("auth");
        return;
      }

      const profile = await supabaseService.ensureCustomerProfile();
      if (!profile) throw new Error("Your customer profile could not be loaded. Please sign in again.");
      setCustomerProfile(profile);
      fillDetailsFromProfile(profile);
      setAuthStep("details");
    } catch (error) {
      console.error("Address load failed", error);
      setAuthStep("details");
      setAuthError(getErrorMessage(error, "Unable to load your address details."));
    }
  };

  const handleConfirmOrder = async () => {
    // Check if profile is complete for checkout
    if (!customerProfile) {
      // Not logged in — start at auth step
      setDetailsPurpose("checkout");
      setAuthStep("auth");
      setAuthError("");
      setIsAuthModalOpen(true);
      return;
    }
    if (!supabaseService.isProfileComplete(customerProfile)) {
      openDeliveryDetails("checkout", customerProfile);
      return;
    }
    // Profile complete — proceed to payment
    await processOrderPayment(customerProfile);
  };

  // Auth step: email/password signup or login
  const handleAuthEmailSubmit = async () => {
    if (!authEmail.trim()) { setAuthError("Please enter your email."); return; }
    if (!authPassword.trim()) { setAuthError("Please enter your password."); return; }
    setAuthLoading(true);
    setAuthError("");
    try {
      if (isSignUp) {
        await supabaseService.customerSignUp(authEmail.trim(), authPassword);
        setAuthStep("otp");
      } else {
        const { profile } = await supabaseService.customerSignIn(authEmail.trim(), authPassword);
        setCustomerProfile(profile);
        if (profile) fillDetailsFromProfile(profile);
        if (profile && supabaseService.isProfileComplete(profile)) {
          setIsAuthModalOpen(false);
          await processOrderPayment(profile);
        } else {
          setDetailsPurpose("checkout");
          setAuthStep("details");
        }
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // Google OAuth
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      await supabaseService.customerGoogleSignIn();
      // OAuth will redirect, then on return the useEffect will handle profile
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Google sign-in failed");
      setAuthLoading(false);
    }
  };

  // OTP verification
  const handleOTPSubmit = async () => {
    if (!otpCode.trim() || otpCode.length < 6) {
      setAuthError("Please enter the 6-digit code from your email.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const verified = await supabaseService.verifyEmailOTP(authEmail, otpCode.trim());
      if (!verified) throw new Error("Invalid or expired code");
      // Get profile after verification
      const profile = await supabaseService.ensureCustomerProfile();
      setCustomerProfile(profile);
      setAuthStep("details");
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      await supabaseService.resendOTP(authEmail);
      setAuthError(""); // Clear any error, show success implicitly
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Failed to resend code");
    } finally {
      setAuthLoading(false);
    }
  };

  const isDetailsPhoneVerified = (() => {
    if (!CUSTOMER_PHONE_OTP_ENABLED) return !!detailsPhone.trim();
    try {
      return !!verifiedPhone && supabaseService.normalizePhone(detailsPhone) === verifiedPhone;
    } catch {
      return false;
    }
  })();

  const handleSendPhoneOtp = async () => {
    setPhoneOtpLoading(true);
    setAuthError("");
    try {
      await supabaseService.sendPhoneOTP(detailsPhone);
      setPhoneOtpSent(true);
      setPhoneOtpCode("");
    } catch (e) {
      setAuthError(getErrorMessage(e));
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    setPhoneOtpLoading(true);
    setAuthError("");
    try {
      const normalized = await supabaseService.verifyPhoneOTP(detailsPhone, phoneOtpCode.trim());
      setVerifiedPhone(normalized);
      setDetailsPhone(normalized);
      setPhoneOtpSent(false);
      setPhoneOtpCode("");
    } catch (e) {
      setAuthError(getErrorMessage(e));
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  // Details step: phone + address
  const handleDetailsSubmit = async () => {
    const detailsErr = deliveryDetailsError({
      name: detailsName,
      phone: detailsPhone,
      addressLine1: detailsAddressLine1,
      addressLine2: detailsAddressLine2,
      street: detailsStreet,
      area: detailsArea,
      city: detailsCity,
      pincode: detailsPincode,
    });
    if (detailsErr) { setAuthError(detailsErr); return; }
    if (CUSTOMER_PHONE_OTP_ENABLED && !isDetailsPhoneVerified) {
      setAuthError("Please verify your mobile number with the OTP.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    try {
      const customer = await supabaseService.getCurrentCustomer();
      if (!customer) throw new Error("Not logged in");
      if (!CUSTOMER_PHONE_OTP_ENABLED) {
        await supabaseService.saveUnverifiedCustomerPhone(detailsPhone);
      }

      await supabaseService.updateCustomerProfile(customer.userId, {
        name: detailsName.trim(),
        addressLine1: detailsAddressLine1.trim(),
        addressLine2: detailsAddressLine2.trim(),
        street: detailsStreet.trim(),
        area: detailsArea.trim(),
        landmark: detailsLandmark.trim() || undefined,
        city: detailsCity.trim(),
        state: DEFAULT_DELIVERY_STATE,
        pincode: detailsPincode.trim(),
        lat: detailsLat,
        lng: detailsLng,
        formattedAddress: detailsFormattedAddress.trim() || undefined,
      });

      const updatedProfile = await supabaseService.getCustomerProfile(customer.userId);
      setCustomerProfile(updatedProfile);
      setIsAuthModalOpen(false);
      if (detailsPurpose === "edit") {
        setDetailsPurpose("checkout");
        return;
      }
      if (updatedProfile) {
        await processOrderPayment(updatedProfile);
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Failed to save details");
    } finally {
      setAuthLoading(false);
    }
  };

  const processOrderPayment = async (profile: CustomerProfile) => {
    if (!orderingStatus.open) {
      alert(orderingStatus.message);
      return;
    }
    if (!restaurantId) {
      alert("Restaurant not found. Please scan the QR code again.");
      return;
    }
    setIsOrdering(true);
    const timeToOrder = (Date.now() - sessionStartTime) / 1000;
    try {
      // 1. Create Razorpay order server-side
      const orderRes = await fetch(PAYMENT_API_PATHS.createOrder, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: cart,
          currency,
          restaurantId,
          customerName: profile.name ?? "Customer",
        }),
      });
      if (!orderRes.ok) {
        const err = await orderRes.json() as { error?: string };
        throw new Error(err.error ?? "Failed to create payment");
      }
      const { orderId, amount: rzpAmount, currency: rzpCurrency, keyId } = await orderRes.json() as {
        orderId: string; amount: number; currency: string; keyId: string;
      };

      // 2. Open Razorpay checkout
      const payment = await openRazorpayCheckout({
        keyId,
        orderId,
        amount: rzpAmount,
        currency: rzpCurrency,
        name: displayRestaurantName ?? "Minute Menus",
        description: `Order — ${cart.length} item${cart.length !== 1 ? "s" : ""}`,
        prefill: { name: profile.name, contact: profile.phone, email: profile.email },
      });

      // 3. Verify the payment and record the order server-side (atomic —
      // the order is only ever written after a signature check passes)
      const newlySoldOut = cart
        .map((item) => {
          const dish = flatDishes.find((d) => d.id === item.dishId);
          if (!dish || dish.stockQuantity == null) return null;
          const prevSold = soldCounts[item.dishId] ?? 0;
          const afterSold = prevSold + item.quantity;
          if (afterSold >= dish.stockQuantity && prevSold < dish.stockQuantity) {
            return { id: dish.id, name: dish.name };
          }
          return null;
        })
        .filter((d): d is { id: string; name: string } => d !== null);

      const { data: confirmSession } = await supabase.auth.getSession();
      const confirmRes = await fetch(PAYMENT_API_PATHS.confirmOrder, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(confirmSession.session ? { authorization: `Bearer ${confirmSession.session.access_token}` } : {}),
        },
        body: JSON.stringify({
          ...payment,
          restaurantId,
          items: cart,
          currency,
          timeToOrder,
        }),
      });
      if (!confirmRes.ok) {
        const err = await confirmRes.json() as { error?: string };
        throw new Error(err.error ?? "Payment verified but order failed to record");
      }

      // 4. Order recorded — best-effort sold-out notification emails
      if (newlySoldOut.length > 0) {
        await Promise.allSettled(
          newlySoldOut.map((d) => supabaseService.sendSoldOutEmail(d.id, d.name, "stock")),
        );
      }

      setSoldCounts((prev) => {
        const updated = { ...prev };
        cart.forEach((item) => {
          updated[item.dishId] = (updated[item.dishId] ?? 0) + item.quantity;
        });
        return updated;
      });
      setCart([]);
      setIsCartOpen(false);
      alert("Payment successful! Your order has been sent to the kitchen.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      if (msg !== "Payment cancelled") alert(`Order failed: ${msg}`);
    } finally {
      setIsOrdering(false);
    }
  };

  const orderTax = useMemo(
    () => calculateOrderTax(cart, currency),
    [cart, currency],
  );
  const cartItemsWithGst = useMemo(
    () => enrichOrderItemsWithGst(cart, currency),
    [cart, currency],
  );
  const showGst = isIndianGstApplicable(currency);
  const modalMealSlots = MEAL_SLOTS_BY_COUNT[selectedMealsPerDay] ?? [];
  const modalRotationDishIds = mealRotations[editingMealSlot] ?? [];
  const modalDurationOptions = modalPlan?.pricingOptions
    .filter((option) => option.mealsPerDay === selectedMealsPerDay && option.pricePerMeal > 0)
    .map((option) => option.durationDays) ?? [];
  const modalMealCountOptions = modalPlan?.pricingOptions
    .filter((option) => option.durationDays === selectedDurationDays && option.pricePerMeal > 0)
    .map((option) => option.mealsPerDay) ?? [];
  const modalPlanTax = useMemo(() => {
    if (!modalPlan) return null;
    const option = getMealPlanPricingOption(
      modalPlan.pricingOptions,
      selectedDurationDays,
      selectedMealsPerDay,
    );
    if (!option) return null;
    return calculateTermMealPlanTax(
      option.pricePerMeal,
      selectedDurationDays,
      selectedMealsPerDay,
      modalPlan.deliveryFee,
      subDeliveryType === "delivery" && subDeliveryFeeMode === "upfront",
      currency,
    );
  }, [modalPlan, selectedDurationDays, selectedMealsPerDay, subDeliveryType, subDeliveryFeeMode, currency]);
  const itemCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart],
  );
  const cartQtyByDish = useMemo(() => {
    // Sum quantities across all variants of the same dish
    const map: Record<string, number> = {};
    for (const item of cart) {
      // cartKey is either dishId or dishId__variantId; strip the variant suffix
      const realDishId = item.dishId.split("__")[0];
      map[realDishId] = (map[realDishId] ?? 0) + item.quantity;
    }
    return map;
  }, [cart]);
  const deliveryAddressSummary = useMemo(() => {
    if (!customerProfile || !supabaseService.isProfileComplete(customerProfile)) return null;
    return formatDeliveryAddress(customerProfile);
  }, [customerProfile]);
  const displayRestaurantName = useMemo(
    () => (restaurantName ? formatDisplayName(restaurantName) : null),
    [restaurantName],
  );
  const brandNameParts = useMemo(() => {
    if (!displayRestaurantName) return null;
    const words = displayRestaurantName.split(" ");
    return { lead: words[0] ?? displayRestaurantName, rest: words.slice(1).join(" ") };
  }, [displayRestaurantName]);

  const renderDishSoldOut = (dish: Dish) => isDishSoldOut(dish, soldCounts);

  // ── Subscription helpers ──────────────────────────────────────────
  const isPastCutoff = () => {
    const now = new Date();
    return now.getUTCHours() > 11 || (now.getUTCHours() === 11 && now.getUTCMinutes() >= 30);
  };

  const tomorrowDate = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const isDateModifiable = (date: string) =>
    Boolean(customerSub && customerSub.status === "active" &&
      date >= customerSub.startDate && date <= customerSub.endDate &&
      (date > tomorrowDate() || (date === tomorrowDate() && !isPastCutoff())));

  const getRotationDishForDate = (date: string, mealSlot: MealSlot): Dish | undefined => {
    const ids = customerSub?.mealRotations[mealSlot] ??
      (mealSlot === "lunch" ? customerSub?.rotationDishIds : undefined) ?? [];
    if (!ids.length || !customerSub) return planDishes[0];
    const msPerDay = 86400000;
    const dayIndex = Math.floor((new Date(date).getTime() - new Date(customerSub.startDate).getTime()) / msPerDay);
    const idx = ((dayIndex % ids.length) + ids.length) % ids.length;
    return planDishes.find(d => d.id === ids[idx]);
  };

  const loadDishesForPlan = (plan: MealPlan) => {
    const dishes = displayCategories.flatMap((c) => c.items).filter((d) => plan.dishIds.includes(d.id));
    setPlanDishes(dishes);
  };

  const isPlanPurchasable = (plan: MealPlan) =>
    plan.isActive && plan.pricingOptions.some((option) => option.pricePerMeal > 0);

  const preparePlanPurchase = (plan: MealPlan, initialDishId?: string) => {
    const option = plan.pricingOptions.find((pricing) => pricing.pricePerMeal > 0) ??
      plan.pricingOptions[0] ?? { durationDays: 28, mealsPerDay: 1, pricePerMeal: 0 };
    setModalPlan(plan);
    setSelectedDurationDays(option.durationDays);
    setSelectedMealsPerDay(option.mealsPerDay);
    setEditingMealSlot(MEAL_SLOTS_BY_COUNT[option.mealsPerDay]?.[0] ?? "lunch");
    setMealRotations(initialDishId ? { lunch: [initialDishId] } : {});
    loadDishesForPlan(plan);
    setModalStep(1);
    setIsMealPlanModalOpen(true);
  };

  const openSubPanel = async () => {
    setSubView("lookup");
    setSubError("");
    setIsSubOpen(true);
    // Pre-load plans so new customers see them without needing to look up first
    if (restaurantId) {
      try {
        const plans = await supabaseService.getMealPlans(restaurantId);
        setAvailablePlans(plans.filter(isPlanPurchasable));
      } catch { /* non-fatal — plans will load on lookup */ }
    }
  };

  const openMealPlanModal = async (dish: Dish) => {
    // Ensure plans are loaded first
    let plans = availablePlans;
    if (!plans.length && restaurantId) {
      try {
        const fetched = await supabaseService.getMealPlans(restaurantId);
        plans = fetched.filter(isPlanPurchasable);
        setAvailablePlans(plans);
      } catch { return; }
    }
    const plan = plans.find(p => p.dishIds.includes(dish.id));
    if (!plan) return;
    preparePlanPurchase(plan, dish.id);
  };

  const closeMealPlanModal = () => {
    setIsMealPlanModalOpen(false);
    setModalPlan(null);
    setMealRotations({});
    setModalStep(1);
  };

  const toggleRotationDish = (dishId: string) => {
    setMealRotations((prev) => {
      const current = prev[editingMealSlot] ?? [];
      return {
        ...prev,
        [editingMealSlot]: current.includes(dishId)
          ? current.filter((id) => id !== dishId)
          : [...current, dishId],
      };
    });
  };

  const handleSubLookup = async () => {
    if (!subPhone.trim() || !restaurantId) return;
    setSubLoading(true);
    setSubError("");
    try {
      const sub = await supabaseService.getCustomerSubscription(subPhone.trim(), restaurantId);
      const today = new Date().toISOString().slice(0, 10);
      if (sub && sub.status !== "cancelled" && sub.endDate >= today) {
        setCustomerSub(sub);
        const orders = await supabaseService.getCustomerDailyOrders(sub.id, tomorrowDate());
        setDailyOrders(orders);
        const plans = await supabaseService.getMealPlans(restaurantId);
        setAvailablePlans(plans.filter(isPlanPurchasable));
        const plan = plans.find((p) => p.id === sub.planId);
        if (plan) loadDishesForPlan(plan);
        setSubView("manage");
      } else {
        setCustomerSub(null);
        setDailyOrders([]);
        const plans = await supabaseService.getMealPlans(restaurantId);
        setAvailablePlans(plans.filter(isPlanPurchasable));
        setSubView("plans");
      }
    } catch {
      setSubError("Failed to look up subscription. Please try again.");
    } finally {
      setSubLoading(false);
    }
  };

  const handleSelectPlan = (plan: MealPlan) => {
    preparePlanPurchase(plan);
  };

  const handleCreateSubscription = async (
    plan: MealPlan,
    rotations: Partial<Record<MealSlot, string[]>>,
  ) => {
    const mealSlots = MEAL_SLOTS_BY_COUNT[selectedMealsPerDay] ?? [];
    if (!subPhone.trim() || !subName.trim() || !restaurantId) return;
    if (!getMealPlanPricingOption(plan.pricingOptions, selectedDurationDays, selectedMealsPerDay)) {
      setSubError("Choose a configured duration and meal count for this plan.");
      return;
    }
    if (mealSlots.some((slot) => !rotations[slot]?.length)) {
      setSubError("Choose a dish rotation for every meal in your plan.");
      return;
    }
    setSubLoading(true);
    setSubError("");
    try {
      // 1. Create Razorpay order server-side
      const orderRes = await fetch(PAYMENT_API_PATHS.createSubscriptionOrder, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          restaurantId,
          phone: subPhone.trim(),
          deliveryFeeMode: subDeliveryFeeMode,
          deliveryType: subDeliveryType,
          durationDays: selectedDurationDays,
          mealsPerDay: selectedMealsPerDay,
          currency,
        }),
      });
      if (!orderRes.ok) {
        const err = await orderRes.json() as { error?: string };
        throw new Error(err.error ?? "Failed to create payment");
      }
      const { orderId, amount, currency: rzpCurrency, keyId } = await orderRes.json() as {
        orderId: string; amount: number; currency: string; keyId: string;
      };

      // 2. Open Razorpay checkout
      const payment = await openRazorpayCheckout({
        keyId,
        orderId,
        amount,
        currency: rzpCurrency,
        name: displayRestaurantName ?? "Minute Menus",
        description: plan.name,
        prefill: { name: subName, contact: subPhone, email: subEmail || undefined },
      });

      // 3. Verify the payment and create the subscription server-side (atomic —
      // the subscription is only ever written after a signature check passes)
      const confirmRes = await fetch(PAYMENT_API_PATHS.confirmSubscription, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payment,
          restaurantId,
          planId: plan.id,
          customerName: subName.trim(),
          phone: subPhone.trim(),
          email: subEmail.trim() || undefined,
          deliveryType: subDeliveryType,
          deliveryFeeMode: subDeliveryFeeMode,
          durationDays: selectedDurationDays,
          mealsPerDay: selectedMealsPerDay,
          mealRotations: rotations,
          currency,
        }),
      });
      if (!confirmRes.ok) {
        const err = await confirmRes.json() as { error?: string };
        throw new Error(err.error ?? "Payment verified but subscription failed to create");
      }
      const newSub = await supabaseService.getCustomerSubscription(subPhone.trim(), restaurantId);
      setCustomerSub(newSub);
      setDailyOrders([]);
      closeMealPlanModal();
      setIsSubOpen(true);
      setSubView("manage");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to subscribe. Please try again.";
      if (msg !== "Payment cancelled") setSubError(msg);
    } finally {
      setSubLoading(false);
    }
  };

  const handleSelectDish = async (dishId: string, mealSlot: MealSlot) => {
    if (!subPhone.trim() || !restaurantId || !customerSub) return;
    setSubLoading(true);
    try {
      await supabaseService.selectDailyDish(subPhone.trim(), restaurantId, selectedScheduleDate, dishId, mealSlot);
      const orders = await supabaseService.getCustomerDailyOrders(customerSub.id, tomorrowDate());
      setDailyOrders(orders);
    } catch (e) {
      setSubError(e instanceof Error ? e.message : "Failed to update selection.");
    } finally {
      setSubLoading(false);
    }
  };

  const handlePauseSubscription = async () => {
    if (!subPhone.trim() || !restaurantId || !pauseUntil) return;
    setSubLoading(true);
    try {
      await supabaseService.pauseSubscription(subPhone.trim(), restaurantId, pauseUntil);
      setCustomerSub((prev) => (prev ? { ...prev, status: "paused", pauseUntil } : prev));
      setPauseUntil("");
    } catch (e) {
      setSubError(e instanceof Error ? e.message : "Failed to pause subscription.");
    } finally {
      setSubLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!subPhone.trim() || !restaurantId) return;
    setSubLoading(true);
    try {
      await supabaseService.resumeSubscription(subPhone.trim(), restaurantId);
      setCustomerSub((prev) => (prev ? { ...prev, status: "active", pauseUntil: undefined } : prev));
    } catch (e) {
      setSubError(e instanceof Error ? e.message : "Failed to resume subscription.");
    } finally {
      setSubLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subPhone.trim() || !restaurantId || !cancelReason.trim()) return;
    if (!confirm("Are you sure you want to cancel your subscription? A refund request will be submitted.")) return;
    setSubLoading(true);
    try {
      await supabaseService.cancelCustomerSubscription(subPhone.trim(), restaurantId, cancelReason.trim());
      setCustomerSub((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
      setCancelReason("");
    } catch (e) {
      setSubError(e instanceof Error ? e.message : "Failed to cancel subscription.");
    } finally {
      setSubLoading(false);
    }
  };

  const handleRaiseTicket = async (dailyOrderId: string) => {
    if (!customerSub || !restaurantId || !ticketNotes.trim()) return;
    setSubLoading(true);
    try {
      await supabaseService.raiseDeliveryTicket({
        subscriptionId: customerSub.id,
        dailyOrderId,
        restaurantId,
        reason: ticketReason,
        notes: ticketNotes.trim(),
      });
      setTicketNotes("");
      alert("Ticket raised. The restaurant will investigate and contact you.");
    } catch {
      alert("Failed to raise ticket. Please try again.");
    } finally {
      setSubLoading(false);
    }
  };
  // ────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ ["--trk" as string]: hasActiveOrder ? "2.5rem" : "0rem" }}
      className={`h-screen w-full ${isDarkTheme ? 'bg-black text-white' : 'bg-white text-black'} overflow-hidden font-sans relative transition-colors duration-300`}
    >
      {/* === Header === */}
      <div className={`fixed top-0 left-0 right-0 z-50 pointer-events-none ${isDarkTheme ? "bg-zinc-950/95" : "bg-white/95"} backdrop-blur-md border-b ${isDarkTheme ? "border-zinc-800" : "border-zinc-200"}`}>
        <div className="flex justify-between items-center min-h-[4.5rem] sm:min-h-20 px-4 py-3 sm:px-8 lg:px-10 pointer-events-auto">
          <button
            onClick={onNavigateToDashboard}
            className="flex items-center gap-3 group cursor-pointer hover:opacity-90 transition-opacity min-w-0 max-w-[min(100%,18rem)] sm:max-w-xs"
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ${
                isDarkTheme
                  ? "bg-white text-black ring-white/20"
                  : "bg-zinc-900 text-white ring-zinc-900/10"
              }`}
            >
              <span className="font-bold text-sm sm:text-base">
                {brandInitials(displayRestaurantName)}
              </span>
            </div>
            <div className="min-w-0 text-left">
              {brandNameParts ? (
                <p className="truncate text-base sm:text-lg leading-tight tracking-tight">
                  <span className={`font-bold ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
                    {brandNameParts.lead}
                  </span>
                  {brandNameParts.rest ? (
                    <span className={`font-light ${isDarkTheme ? "text-zinc-400" : "text-zinc-500"}`}>
                      {" "}
                      {brandNameParts.rest}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="truncate text-base sm:text-lg font-bold tracking-tighter leading-tight">
                  MINUTE
                  <span className={`font-light ${isDarkTheme ? "text-zinc-500" : "text-zinc-400"}`}>MENUS</span>
                </p>
              )}
            </div>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* User Account Button */}
            {customerProfile ? (
              <button
                onClick={() => { if (restaurantSlug) window.location.href = `/${restaurantSlug}/orders`; }}
                className={`relative p-2.5 rounded-full backdrop-blur-md border transition-colors shadow-lg ${isDarkTheme ? 'bg-black/40 border-white/20 hover:bg-black/60' : 'bg-white/40 border-black/20 hover:bg-white/60'}`}
                title={`Signed in as ${customerProfile.email} — view my orders`}
              >
                <User size={18} className={isDarkTheme ? 'text-white' : 'text-zinc-800'} />
                {hasActiveOrder && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-amber-500" />}
              </button>
            ) : (
              <button
                onClick={() => { setAuthStep("auth"); setAuthError(""); setIsAuthModalOpen(true); }}
                className={`p-2.5 rounded-full backdrop-blur-md border transition-colors shadow-lg ${isDarkTheme ? 'bg-black/40 border-white/20 hover:bg-black/60' : 'bg-white/40 border-black/20 hover:bg-white/60'}`}
                title="Sign in"
              >
                <User size={18} className={isDarkTheme ? 'text-white/50' : 'text-zinc-400'} />
              </button>
            )}
            <button
              onClick={openSubPanel}
              className={`p-2.5 rounded-full backdrop-blur-md border transition-colors shadow-lg ${isDarkTheme ? 'bg-black/40 border-white/20 hover:bg-black/60' : 'bg-white/40 border-black/20 hover:bg-white/60'}`}
              title="Subscriptions"
            >
              <Bookmark size={18} className={isDarkTheme ? 'text-white' : 'text-zinc-800'} />
            </button>
            <button
              onClick={onToggleTheme}
              className={`p-2.5 rounded-full backdrop-blur-md border transition-colors shadow-lg ${isDarkTheme ? 'bg-black/40 border-white/20 hover:bg-black/60' : 'bg-white/40 border-black/20 hover:bg-white/60'}`}
            >
              {isDarkTheme ? <Sun size={18} className="text-white" /> : <Moon size={18} className="text-zinc-800" />}
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative group transition-transform active:scale-95"
            >
              <div
                className={`backdrop-blur-md p-2.5 rounded-full border transition-colors shadow-lg ${
                  isDarkTheme
                    ? "bg-black/40 border-white/20 hover:bg-black/60"
                    : "bg-white/80 border-zinc-300 hover:bg-zinc-100"
                }`}
              >
                <ShoppingBag size={20} className={isDarkTheme ? "text-white" : "text-zinc-900"} />
              </div>
              {itemCount > 0 && (
                <span
                  className={`absolute -top-1 -right-1 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 ${
                    isDarkTheme
                      ? "bg-white text-black border-black"
                      : "bg-zinc-900 text-white border-white"
                  }`}
                >
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {hasActiveOrder && (
          <LiveOrderTracker order={activeOrders[0]} extraCount={activeOrders.length - 1} isDarkTheme={isDarkTheme} />
        )}
      </div>

      {!menuLoading && displayCategories.length > 0 && (
        <>
        {!orderingStatus.open && (
          <div className="fixed top-[calc(4.5rem_+_var(--trk))] left-4 right-4 z-50 mx-auto max-w-lg rounded-xl border border-amber-500/40 bg-amber-950/95 px-4 py-2.5 text-center text-xs font-medium text-amber-100 shadow-lg backdrop-blur-md">
            {orderingStatus.message}
          </div>
        )}
        <div
          ref={categoryNavRef}
          className={`fixed left-0 right-0 z-40 pointer-events-none ${
            orderingStatus.open ? "top-[calc(4.5rem_+_var(--trk))] sm:top-[calc(5rem_+_var(--trk))]" : "top-[calc(7.3rem_+_var(--trk))] sm:top-[calc(7.8rem_+_var(--trk))]"
          } ${
            isDarkTheme
              ? "bg-zinc-950/95 border-b border-zinc-800"
              : "bg-white/95 border-b border-zinc-200"
          } backdrop-blur-md`}
        >
          <div className="max-w-lg md:max-w-[1600px] mx-auto pointer-events-auto">
            <div className="md:hidden relative px-4">
              <button
                type="button"
                onClick={() => setCategoryMenuOpen((open) => !open)}
                className={`flex w-full items-center justify-between gap-3 py-3 text-left ${
                  isDarkTheme ? "text-white" : "text-zinc-900"
                }`}
                aria-expanded={categoryMenuOpen}
                aria-haspopup="listbox"
              >
                <span className="text-xs font-bold uppercase tracking-[0.18em] truncate">
                  {activeCategory?.title ?? "Categories"}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform ${categoryMenuOpen ? "rotate-180" : ""} ${
                    isDarkTheme ? "text-zinc-400" : "text-zinc-500"
                  }`}
                />
              </button>
              {categoryMenuOpen && (
                <div
                  className={`absolute left-4 right-4 top-full z-50 mt-1 overflow-hidden rounded-xl border shadow-xl ${
                    isDarkTheme ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"
                  }`}
                  role="listbox"
                >
                  {displayCategories.map((cat) => {
                    const isActive = cat.id === activeCategoryId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => scrollToCategory(cat.id)}
                        className={`flex w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] transition-colors ${
                          isActive
                            ? isDarkTheme
                              ? "bg-white text-black"
                              : "bg-zinc-900 text-white"
                            : isDarkTheme
                              ? "text-zinc-300 hover:bg-zinc-800"
                              : "text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        {cat.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="hidden md:flex items-stretch px-4 md:px-8 lg:px-10">
              {displayCategories.map((cat) => {
                const isActive = cat.id === activeCategoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => scrollToCategory(cat.id)}
                    className={`flex-1 px-2 py-3.5 text-center text-[11px] lg:text-xs font-bold uppercase tracking-[0.14em] lg:tracking-[0.18em] border-b-2 transition-colors ${
                      isActive
                        ? isDarkTheme
                          ? "border-white text-white"
                          : "border-zinc-900 text-zinc-900"
                        : isDarkTheme
                          ? "border-transparent text-zinc-500 hover:text-zinc-300"
                          : "border-transparent text-zinc-400 hover:text-zinc-700"
                    }`}
                  >
                    {cat.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        </>
      )}

      {/* === Menu browse === */}
      <div
        ref={containerRef}
        className={`h-full w-full overflow-y-auto overscroll-contain scroll-smooth ${orderingStatus.open ? "pt-[calc(7.5rem_+_var(--trk))] sm:pt-[calc(8.5rem_+_var(--trk))]" : "pt-[calc(10.3rem_+_var(--trk))] sm:pt-[calc(11rem_+_var(--trk))]"} pb-24 ${isDarkTheme ? "bg-zinc-950" : "bg-white"}`}
      >
        {menuLoading ? (
          <div className={`flex items-center justify-center py-20 text-sm ${isDarkTheme ? "text-zinc-500" : "text-zinc-400"}`}>
            Loading menu…
          </div>
        ) : displayCategories.length === 0 ? (
          <div className={`flex items-center justify-center py-20 text-sm ${isDarkTheme ? "text-zinc-500" : "text-zinc-400"}`}>
            No menu items yet.
          </div>
        ) : (
          <>
            <div className="max-w-lg md:max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 md:py-4">
              {displayCategories.map((cat) => (
                <section
                  key={cat.id}
                  id={`menu-cat-${cat.id}`}
                  data-category-id={cat.id}
                  className={`scroll-mt-[calc(7.5rem_+_var(--trk))] sm:scroll-mt-[calc(8.5rem_+_var(--trk))] ${
                    isDarkTheme ? "border-t border-zinc-800/80 pt-28 md:pt-44 first:border-t-0 first:pt-0" : "border-t border-zinc-200 pt-28 md:pt-44 first:border-t-0 first:pt-0"
                  }`}
                >
                  <div className="md:hidden">
                    {cat.items.map((dish) => (
                      <MenuListCard
                        key={dish.id}
                        dish={dish}
                        currency={currency}
                        isSoldOut={renderDishSoldOut(dish)}
                        disabled={!orderingStatus.open}
                        onAdd={handleAddToOrder}
                        isDarkTheme={isDarkTheme}
                        quantity={cartQtyByDish[dish.id] ?? 0}
                        categoryDiscountPercent={cat.discountPercent ?? 0}
                      />
                    ))}
                  </div>

                  <div className="hidden md:grid md:grid-cols-3 xl:grid-cols-4 md:gap-4 lg:gap-5 items-stretch">
                    {cat.items.map((dish) => (
                      <MenuGridCard
                        key={dish.id}
                        dish={dish}
                        currency={currency}
                        isSoldOut={renderDishSoldOut(dish)}
                        disabled={!orderingStatus.open}
                        onAdd={handleAddToOrder}
                        isDarkTheme={isDarkTheme}
                        quantity={cartQtyByDish[dish.id] ?? 0}
                        categoryDiscountPercent={cat.discountPercent ?? 0}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>

      {/* === Customer Auth Modal (Multi-step) === */}
      {orderToast && (
        <button
          type="button"
          onClick={() => setOrderToast("")}
          className="fixed left-1/2 top-4 z-[80] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl bg-indigo-600 px-4 py-3 text-left text-sm font-medium text-white shadow-2xl"
        >
          {orderToast}
        </button>
      )}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
              {authStep !== "auth" && (
                <button
                  onClick={() => {
                    if (authStep === "details" && detailsPurpose === "edit") {
                      setIsAuthModalOpen(false);
                      setDetailsPurpose("checkout");
                      return;
                    }
                    setAuthStep(authStep === "details" && !customerProfile?.emailVerified ? "otp" : "auth");
                  }}
                  className="p-1.5 hover:bg-zinc-900 rounded-full transition-colors"
                >
                  <ChevronLeft size={20} className="text-zinc-400" />
                </button>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-light tracking-tight text-white">
                  {authStep === "auth" && (isSignUp ? "Create Account" : "Welcome Back")}
                  {authStep === "otp" && "Verify Email"}
                  {authStep === "details" && (detailsPurpose === "edit" ? "Edit Address" : "Delivery Details")}
                </h2>
                <p className="text-zinc-500 text-sm mt-0.5">
                  {authStep === "auth" && "Sign up or log in to complete your order"}
                  {authStep === "otp" && `Enter the code sent to ${authEmail}`}
                  {authStep === "details" && (detailsPurpose === "edit"
                    ? "Update where we should deliver this order"
                    : "We need your details for delivery")}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAuthModalOpen(false);
                  setDetailsPurpose("checkout");
                }}
                className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
              >
                <X size={24} strokeWidth={1} className="text-zinc-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {authError && (
                <div className="mb-4 px-4 py-3 rounded bg-red-950/60 border border-red-800 text-red-400 text-sm">{authError}</div>
              )}

              {/* Step 1: Auth (email/password or Google) */}
              {authStep === "auth" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-zinc-500">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="email"
                        value={authEmail}
                        autoFocus
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-zinc-900 border border-zinc-700 text-white pl-10 pr-4 py-3 rounded text-sm outline-none focus:border-zinc-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-zinc-500">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAuthEmailSubmit()}
                        placeholder={isSignUp ? "Create a password" : "Enter password"}
                        className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded text-sm outline-none focus:border-zinc-500 transition-colors pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleAuthEmailSubmit}
                    disabled={authLoading}
                    className="w-full py-3.5 bg-white text-black rounded font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ButtonSpinner loading={authLoading} spinnerSize="sm">
                      {isSignUp ? "SIGN UP" : "LOG IN"}
                    </ButtonSpinner>
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800" /></div>
                    <div className="relative flex justify-center text-xs"><span className="bg-zinc-950 px-2 text-zinc-500">OR</span></div>
                  </div>

                  <button
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                    className="w-full py-3 border border-zinc-700 rounded font-medium text-sm text-white hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    Continue with Google
                  </button>

                  <p className="text-center text-zinc-500 text-sm mt-4">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button onClick={() => { setIsSignUp(!isSignUp); setAuthError(""); }} className="text-white underline underline-offset-2 hover:text-zinc-300">
                      {isSignUp ? "Log in" : "Sign up"}
                    </button>
                  </p>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {authStep === "otp" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-zinc-500">Verification Code</label>
                    <input
                      type="text"
                      value={otpCode}
                      autoFocus
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={(e) => e.key === "Enter" && handleOTPSubmit()}
                      placeholder="Enter 6-digit code"
                      className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded text-sm outline-none focus:border-zinc-500 transition-colors text-center tracking-[0.5em] font-mono text-lg"
                      maxLength={6}
                    />
                  </div>
                  <button
                    onClick={handleOTPSubmit}
                    disabled={authLoading || otpCode.length < 6}
                    className="w-full py-3.5 bg-white text-black rounded font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ButtonSpinner loading={authLoading} spinnerSize="sm">VERIFY</ButtonSpinner>
                  </button>
                  <p className="text-center text-zinc-500 text-sm">
                    Didn't receive the code?{" "}
                    <button onClick={handleResendOTP} disabled={authLoading} className="text-white underline underline-offset-2 hover:text-zinc-300 disabled:opacity-50">
                      Resend
                    </button>
                  </p>
                </div>
              )}

              {/* Step 3: Details (phone + address) */}
              {authStep === "details" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-zinc-500">Full Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          value={detailsName}
                          autoFocus
                          onChange={(e) => setDetailsName(e.target.value)}
                          placeholder="Your name"
                          className="w-full bg-zinc-900 border border-zinc-700 text-white pl-10 pr-4 py-2.5 rounded text-sm outline-none focus:border-zinc-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-zinc-500">Phone</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="tel"
                          value={detailsPhone}
                          onChange={(e) => { setDetailsPhone(e.target.value); setPhoneOtpSent(false); }}
                          placeholder="+91 98765 43210"
                          className="w-full bg-zinc-900 border border-zinc-700 text-white pl-10 pr-4 py-2.5 rounded text-sm outline-none focus:border-zinc-500 transition-colors"
                        />
                      </div>
                      {!CUSTOMER_PHONE_OTP_ENABLED ? (
                        <p className="mt-1.5 text-xs text-zinc-500">Phone verification is temporarily disabled.</p>
                      ) : isDetailsPhoneVerified ? (
                        <p className="mt-1.5 text-xs font-bold text-emerald-400">✓ Mobile number verified</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {phoneOtpSent && (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={phoneOtpCode}
                                onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="6-digit OTP"
                                className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 text-white px-3 py-2 rounded text-sm outline-none focus:border-zinc-500"
                              />
                              <button
                                type="button"
                                onClick={handleVerifyPhoneOtp}
                                disabled={phoneOtpLoading || phoneOtpCode.length < 6}
                                className="px-3 py-2 bg-white text-black rounded text-xs font-bold uppercase disabled:opacity-50"
                              >
                                Verify
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleSendPhoneOtp}
                            disabled={phoneOtpLoading || !detailsPhone.trim()}
                            className="text-xs font-bold uppercase tracking-widest text-white underline underline-offset-2 disabled:opacity-50"
                          >
                            {phoneOtpSent ? "Resend OTP" : "Send OTP"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin size={14} className="text-white" />
                      <span className="text-xs font-bold uppercase tracking-widest text-white">Delivery Address</span>
                    </div>

                    <CustomerAddressLocate
                      onResolved={applyLocatedAddress}
                      onError={(message) => setAuthError(message)}
                    />

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={detailsAddressLine1}
                        onChange={(e) => setDetailsAddressLine1(e.target.value)}
                        placeholder="Apartment / Building / House name *"
                        className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-zinc-500 transition-colors"
                      />
                      <input
                        type="text"
                        value={detailsAddressLine2}
                        onChange={(e) => setDetailsAddressLine2(e.target.value)}
                        placeholder="Flat / Plot number *"
                        className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-zinc-500 transition-colors"
                      />
                      <input
                        type="text"
                        value={detailsStreet}
                        onChange={(e) => setDetailsStreet(e.target.value)}
                        placeholder="Street *"
                        className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-zinc-500 transition-colors"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={detailsArea}
                          onChange={(e) => setDetailsArea(e.target.value)}
                          placeholder="Area / Locality *"
                          className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-zinc-500 transition-colors"
                        />
                        <input
                          type="text"
                          value={detailsLandmark}
                          onChange={(e) => setDetailsLandmark(e.target.value)}
                          placeholder="Landmark (optional)"
                          className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-zinc-500 transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={detailsCity}
                          onChange={(e) => setDetailsCity(e.target.value)}
                          placeholder="City *"
                          className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-zinc-500 transition-colors"
                        />
                        <input
                          type="text"
                          value={detailsState}
                          readOnly
                          tabIndex={-1}
                          aria-readonly="true"
                          placeholder="State"
                          className="w-full bg-zinc-900/60 border border-zinc-700 text-zinc-400 px-4 py-2.5 rounded text-sm outline-none cursor-default"
                        />
                        <input
                          type="text"
                          value={detailsPincode}
                          onChange={(e) => setDetailsPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="Pincode *"
                          className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-zinc-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleDetailsSubmit}
                    disabled={authLoading}
                    className="w-full py-3.5 bg-white text-black rounded font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                  >
                    <ButtonSpinner loading={authLoading} spinnerSize="sm">
                      {detailsPurpose === "edit" ? "SAVE ADDRESS" : "PROCEED TO PAY"}
                    </ButtonSpinner>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === Subscription Panel === */}
      {isSubOpen && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-black h-full shadow-2xl border-l border-zinc-800 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center gap-3">
              {subView !== "lookup" && (
                <button
                  onClick={() => setSubView("lookup")}
                  className="p-1.5 hover:bg-zinc-900 rounded-full transition-colors"
                >
                  <ChevronLeft size={20} className="text-zinc-400" />
                </button>
              )}
              <h2 className="text-xl font-light tracking-tight text-white flex-1">
                {subView === "lookup" && "My Subscription"}
                {subView === "plans" && "Choose a Plan"}
                {subView === "manage" && "Manage Subscription"}
              </h2>
              <button onClick={() => setIsSubOpen(false)} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
                <X size={24} strokeWidth={1} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {subError && (
                <div className="mb-4 px-4 py-3 rounded bg-red-950/60 border border-red-800 text-red-400 text-sm">{subError}</div>
              )}

              {/* ── Lookup view ── */}
              {subView === "lookup" && (
                <div className="space-y-6 mt-2">
                  <p className="text-zinc-400 text-sm">Enter your phone number to access or create a subscription for {displayRestaurantName ?? "this restaurant"}.</p>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-zinc-500">Phone Number</label>
                    <input
                      type="tel"
                      value={subPhone}
                      onChange={(e) => setSubPhone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubLookup()}
                      placeholder="+1 234 567 8900"
                      className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded text-sm outline-none focus:border-zinc-500 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleSubLookup}
                    disabled={subLoading || !subPhone.trim()}
                    className="w-full bg-white text-black py-3.5 rounded font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {subLoading ? <Loader2 className="animate-spin" size={18} /> : "CONTINUE"}
                  </button>
                  {availablePlans.length > 0 && (
                    <button
                      onClick={() => setSubView("plans")}
                      className="w-full text-zinc-500 text-sm underline underline-offset-2 hover:text-zinc-300 transition-colors"
                    >
                      Browse plans without signing in
                    </button>
                  )}
                </div>
              )}

              {/* ── Plans view ── */}
              {subView === "plans" && (
                <div className="space-y-4 mt-2">
                  {availablePlans.length === 0 && (
                    <p className="text-zinc-500 text-sm text-center py-8">No active subscription plans available right now.</p>
                  )}
                  {availablePlans.map((plan) => (
                    <div key={plan.id} className="border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors cursor-pointer" onClick={() => handleSelectPlan(plan)}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-white">{plan.name}</h3>
                        <span className="font-mono text-white text-sm shrink-0">
                          From {formatPriceInCurrency(
                            Math.min(...plan.pricingOptions.filter((option) => option.pricePerMeal > 0).map((option) => option.pricePerMeal)),
                            currency,
                          )}/meal
                        </span>
                      </div>
                      {plan.description && <p className="text-zinc-400 text-sm mb-3">{plan.description}</p>}
                      <div className="flex gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Tag size={11} /> {plan.dishIds.length} dishes</span>
                        <span className="flex items-center gap-1"><CreditCard size={11} /> {plan.deliveryFee > 0 ? `${formatPriceInCurrency(plan.deliveryFee, currency)} per delivery` : "Free delivery"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Manage view ── */}
              {subView === "manage" && customerSub && (
                <div className="space-y-6 mt-2">
                  {/* Status card */}
                  <div className="border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">{customerSub.planName}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${customerSub.status === "active" ? 'bg-green-900/40 text-green-400' : customerSub.status === "paused" ? 'bg-amber-900/40 text-amber-400' : 'bg-red-900/40 text-red-400'}`}>{customerSub.status}</span>
                    </div>
                    <p className="text-zinc-500 text-xs">
                      {customerSub.deliveryType} · {customerSub.legacySchedule
                        ? TIME_SLOT_LABELS[customerSub.timeSlot]
                        : (MEAL_SLOTS_BY_COUNT[customerSub.mealsPerDay] ?? [])
                          .map((slot) => `${MEAL_SLOT_LABELS[slot]} ${TIME_SLOT_LABELS[MEAL_SLOT_TIME_SLOTS[slot]]}`)
                          .join(" · ")}
                    </p>
                    <p className="text-zinc-500 text-xs">{customerSub.durationDays} days · {customerSub.mealsPerDay} meal{customerSub.mealsPerDay === 1 ? "" : "s"} per day</p>
                    <p className="text-zinc-600 text-xs mt-0.5">until {customerSub.endDate}</p>
                    {customerSub.status === "paused" && customerSub.pauseUntil && (
                      <p className="text-amber-400 text-xs mt-1">Paused until {customerSub.pauseUntil}</p>
                    )}
                  </div>

                  {/* Schedule: 7-day rotation strip + per-day override */}
                  {customerSub.status === "active" && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar size={14} className="text-zinc-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Delivery Schedule</h3>
                      </div>

                      {/* 7-day date strip */}
                      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
                        {Array.from({ length: 7 }, (_, i) => {
                          const d = new Date(Date.now() + (i + 1) * 86400000);
                          const dateStr = d.toISOString().slice(0, 10);
                          const dayLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
                          const dayNum = d.getDate();
                          const mealPreview = (MEAL_SLOTS_BY_COUNT[customerSub.mealsPerDay] ?? [])
                            .map((slot) => {
                              const order = dailyOrders.find((o) => o.deliveryDate === dateStr && o.mealSlot === slot);
                              const rotation = getRotationDishForDate(dateStr, slot);
                              return `${MEAL_SLOT_LABELS[slot][0]}: ${order?.dishName ?? rotation?.name ?? "—"}`;
                            })
                            .join(" · ");
                          const isSelected = selectedScheduleDate === dateStr;
                          const modifiable = isDateModifiable(dateStr);
                          return (
                            <button
                              key={dateStr}
                              onClick={() => modifiable && setSelectedScheduleDate(dateStr)}
                              disabled={!modifiable}
                              className={`shrink-0 flex flex-col items-center gap-1 px-2 py-2 rounded border text-center min-w-[52px] transition-colors ${isSelected ? "bg-white text-black border-white" : modifiable ? "border-zinc-700 text-zinc-400 hover:border-zinc-500" : "border-zinc-800 text-zinc-700 cursor-default"}`}
                            >
                              <span className="text-[10px] font-bold uppercase">{dayLabel}</span>
                              <span className="text-sm font-mono font-bold">{dayNum}</span>
                              <span className="text-[9px] leading-tight truncate max-w-[90px]">{mealPreview}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Dish selector for selected date */}
                      {isDateModifiable(selectedScheduleDate) ? (
                        <div className="space-y-5">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                            Meals for {new Date(selectedScheduleDate + "T00:00:00").toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
                          </p>
                          {(MEAL_SLOTS_BY_COUNT[customerSub.mealsPerDay] ?? []).map((mealSlot) => {
                            const orderForMeal = dailyOrders.find((o) =>
                              o.deliveryDate === selectedScheduleDate && o.mealSlot === mealSlot,
                            );
                            const rotationDish = getRotationDishForDate(selectedScheduleDate, mealSlot);
                            return (
                              <div key={mealSlot} className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                  {MEAL_SLOT_LABELS[mealSlot]}
                                </h4>
                                {planDishes.map((dish) => {
                                  const isActive = orderForMeal
                                    ? orderForMeal.dishId === dish.id
                                    : rotationDish?.id === dish.id;
                                  return (
                                    <button key={dish.id}
                                      onClick={() => handleSelectDish(dish.id, mealSlot)}
                                      disabled={subLoading}
                                      className={`w-full text-left px-4 py-3 rounded border flex items-center justify-between transition-colors ${isActive ? "bg-white text-black border-white" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"}`}>
                                      <span className="font-medium text-sm">{dish.name}</span>
                                      <div className="flex items-center gap-2">
                                        {!orderForMeal && isActive && <span className="text-[10px] opacity-60">rotation</span>}
                                        {isActive && <Check size={14} />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                          {planDishes.length === 0 && <p className="text-zinc-500 text-sm">No dishes available in your plan.</p>}
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-sm">
                          {selectedScheduleDate === tomorrowDate()
                            ? "Tomorrow's order is locked — cutoff was 5:00 PM IST."
                            : "Select a future date to change your delivery."}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Pause / Resume */}
                  {customerSub.status === "active" && (
                    <div className="border border-zinc-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Pause size={14} className="text-zinc-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Pause Delivery</h3>
                      </div>
                      <p className="text-zinc-500 text-xs">Pause for up to 7 days per billing cycle.</p>
                      <input type="date" value={pauseUntil} onChange={(e) => setPauseUntil(e.target.value)}
                        min={tomorrowDate()}
                        className="w-full bg-zinc-900 border border-zinc-700 text-white px-3 py-2 rounded text-sm outline-none focus:border-zinc-500" />
                      <button onClick={handlePauseSubscription} disabled={subLoading || !pauseUntil}
                        className="w-full py-2.5 rounded border border-zinc-700 text-zinc-300 text-sm font-medium hover:border-zinc-500 disabled:opacity-50 flex items-center justify-center gap-2">
                        {subLoading ? <Loader2 className="animate-spin" size={16} /> : <><Pause size={14} /> Pause Subscription</>}
                      </button>
                    </div>
                  )}

                  {customerSub.status === "paused" && (
                    <button onClick={handleResumeSubscription} disabled={subLoading}
                      className="w-full py-3 rounded border border-zinc-700 text-zinc-300 text-sm font-medium hover:border-zinc-500 disabled:opacity-50 flex items-center justify-center gap-2">
                      {subLoading ? <Loader2 className="animate-spin" size={16} /> : <><Play size={14} /> Resume Subscription</>}
                    </button>
                  )}

                  {/* Raise a ticket for recent delivered orders */}
                  {dailyOrders.some((o) => o.status === "delivered") && (
                    <div className="border border-zinc-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-zinc-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Report an Issue</h3>
                      </div>
                      <select value={ticketReason} onChange={(e) => setTicketReason(e.target.value as TicketReason)}
                        className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 px-3 py-2 rounded text-sm outline-none">
                        {(Object.entries(TICKET_REASON_LABELS) as [TicketReason, string][]).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      <textarea value={ticketNotes} onChange={(e) => setTicketNotes(e.target.value)} rows={2}
                        placeholder="Describe what happened..."
                        className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 px-3 py-2 rounded text-sm outline-none focus:border-zinc-500 resize-none" />
                      <select onChange={(e) => e.target.value && handleRaiseTicket(e.target.value)}
                        defaultValue="" className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 px-3 py-2 rounded text-sm outline-none">
                        <option value="" disabled>Select affected delivery…</option>
                        {dailyOrders.filter((o) => o.status === "delivered").map((o) => (
                          <option key={o.id} value={o.id}>{o.deliveryDate} — {o.dishName}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Cancel subscription */}
                  {customerSub.status !== "cancelled" && (
                    <div className="border border-red-950/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <X size={14} className="text-red-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-red-500">Cancel Subscription</h3>
                      </div>
                      <p className="text-zinc-500 text-xs">A refund request will be submitted for the unused portion.</p>
                      <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2}
                        placeholder="Reason for cancellation..."
                        className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 px-3 py-2 rounded text-sm outline-none focus:border-red-900 resize-none" />
                      <button onClick={handleCancelSubscription} disabled={subLoading || !cancelReason.trim()}
                        className="w-full py-2.5 rounded border border-red-900 text-red-400 text-sm font-medium hover:bg-red-950/40 disabled:opacity-50 flex items-center justify-center gap-2">
                        {subLoading ? <Loader2 className="animate-spin" size={16} /> : "Cancel Subscription"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === Meal Plan Modal (dish-driven subscription creation) === */}
      {isMealPlanModalOpen && modalPlan && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-zinc-800 shrink-0">
            {modalStep === 2 && (
              <button onClick={() => setModalStep(1)} className="p-1.5 hover:bg-zinc-900 rounded-full transition-colors">
                <ChevronLeft size={20} className="text-zinc-400" />
              </button>
            )}
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {modalStep === 1 ? "Build Your Rotation" : "Your Details"}
              </p>
              <h2 className="text-lg font-light text-white leading-tight">{modalPlan.name}</h2>
            </div>
            <button onClick={closeMealPlanModal} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
              <X size={22} strokeWidth={1} className="text-zinc-400" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex gap-1.5 px-4 pt-3 shrink-0">
            {[1, 2].map(s => (
              <div key={s} className={`h-0.5 flex-1 rounded-full transition-colors ${modalStep >= s ? "bg-white" : "bg-zinc-800"}`} />
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {modalStep === 1 && (
              <>
                <p className="text-zinc-400 text-sm">Choose your term and meals per day, then select a rotating dish list for each meal.</p>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Plan duration</span>
                    <select value={selectedDurationDays}
                      onChange={(event) => setSelectedDurationDays(Number(event.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-white px-3 py-2.5 rounded text-sm">
                      {modalDurationOptions.map((days) => (
                        <option key={days} value={days}>{days} days</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Meals per day</span>
                    <select value={selectedMealsPerDay}
                      onChange={(event) => {
                        const count = Number(event.target.value);
                        const firstDuration = modalPlan?.pricingOptions.find(
                          (option) => option.mealsPerDay === count && option.pricePerMeal > 0,
                        )?.durationDays;
                        setSelectedMealsPerDay(count);
                        if (firstDuration) setSelectedDurationDays(firstDuration);
                        setEditingMealSlot(MEAL_SLOTS_BY_COUNT[count]?.[0] ?? "lunch");
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 text-white px-3 py-2.5 rounded text-sm">
                      {modalMealCountOptions.map((count) => (
                        <option key={count} value={count}>{count} meal{count === 1 ? "" : "s"}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex items-center justify-between border border-zinc-800 rounded-lg px-3 py-2 text-xs">
                  <span className="text-zinc-500">Per-meal rate</span>
                  <span className="text-white">
                    {formatPriceInCurrency(
                      getMealPlanPricingOption(modalPlan.pricingOptions, selectedDurationDays, selectedMealsPerDay)?.pricePerMeal ?? 0,
                      currency,
                    )}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {modalMealSlots.map((slot) => (
                    <button key={slot} onClick={() => setEditingMealSlot(slot)}
                      className={`shrink-0 px-3 py-2 rounded border text-xs font-bold ${editingMealSlot === slot ? "bg-white text-black border-white" : "border-zinc-700 text-zinc-400"}`}>
                      {MEAL_SLOT_LABELS[slot]}
                      {mealRotations[slot]?.length ? " ✓" : ""}
                    </button>
                  ))}
                </div>
                <p className="text-zinc-400 text-sm">
                  {MEAL_SLOT_LABELS[editingMealSlot]} rotation — dishes cycle in the order you select them.
                </p>
                <div className="space-y-2">
                  {modalPlanDishes.map(dish => {
                    const isSelected = modalRotationDishIds.includes(dish.id);
                    return (
                      <button
                        key={dish.id}
                        onClick={() => toggleRotationDish(dish.id)}
                        className={`w-full text-left px-4 py-3 rounded border flex items-center justify-between gap-3 transition-colors ${isSelected ? "bg-white text-black border-white" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{dish.name}</p>
                          <p className={`text-xs truncate ${isSelected ? "text-zinc-500" : "text-zinc-500"}`}>{dish.description}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? "bg-black border-black" : "border-zinc-500"}`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Rotation preview */}
                {modalRotationDishIds.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">{MEAL_SLOT_LABELS[editingMealSlot]} Rotation Preview</p>
                    <div className="space-y-1">
                      {Array.from({ length: Math.min(7, modalRotationDishIds.length * 2) }, (_, i) => {
                        const dishId = modalRotationDishIds[i % modalRotationDishIds.length];
                        const d = modalPlanDishes.find(x => x.id === dishId);
                        const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7];
                        return d ? (
                          <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className="w-8 text-zinc-600 font-mono">{dayLabel}</span>
                            <span className="text-white">{d.name}</span>
                            {modalRotationDishIds.length > 1 && i >= modalRotationDishIds.length && (
                              <span className="text-zinc-600 text-[10px]">↺</span>
                            )}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {modalStep === 2 && (
              <div className="space-y-5">
                {([
                  { label: "Phone Number", key: "phone", type: "tel" as const, value: subPhone, set: setSubPhone, placeholder: "+91 98765 43210" },
                  { label: "Your Name", key: "name", type: "text" as const, value: subName, set: setSubName, placeholder: "Full name" },
                  { label: "Email (optional)", key: "email", type: "email" as const, value: subEmail, set: setSubEmail, placeholder: "for order confirmations" },
                ] as const).map(({ label, type, value, set, placeholder }) => (
                  <div key={label}>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-zinc-500">{label}</label>
                    <input type={type} value={value} onChange={(e) => (set as (v: string) => void)(e.target.value)} placeholder={placeholder}
                      className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-zinc-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-zinc-500">Delivery Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["delivery", "pickup"] as SubDeliveryType[]).map(t => (
                      <button key={t} onClick={() => setSubDeliveryType(t)}
                        className={`py-2.5 rounded border text-sm font-medium capitalize transition-colors ${subDeliveryType === t ? "bg-white text-black border-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  {subDeliveryType === "delivery" && modalPlan.deliveryFee > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        {formatPriceInCurrency(modalPlan.deliveryFee, currency)} per delivery · {selectedDurationDays * selectedMealsPerDay} deliveries
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["cash_on_delivery", "upfront"] as DeliveryFeeMode[]).map(mode => (
                          <button key={mode} onClick={() => setSubDeliveryFeeMode(mode)}
                            className={`py-2 rounded border text-xs font-medium transition-colors ${subDeliveryFeeMode === mode ? "bg-white text-black border-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                            {mode === "upfront"
                              ? `Pay upfront (+${formatPriceInCurrency(modalPlan.deliveryFee * selectedDurationDays * selectedMealsPerDay, currency)})`
                              : "Pay each delivery"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  {selectedDurationDays} days · {selectedMealsPerDay} meal{selectedMealsPerDay === 1 ? "" : "s"} per day · Each meal arrives in its Breakfast, Lunch, or Dinner delivery window.
                </p>
                {subError && <p className="text-red-400 text-sm">{subError}</p>}
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div className="p-4 border-t border-zinc-800 shrink-0">
            {modalStep === 1 ? (
              <button
                onClick={() => setModalStep(2)}
                disabled={!modalPlanTax || modalMealSlots.some((slot) => !mealRotations[slot]?.length)}
                className="w-full bg-white text-black py-3.5 rounded font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-40"
              >
                NEXT →
              </button>
            ) : (
              <>
                {showGst && modalPlanTax && (
                  <div className="space-y-1.5 text-sm border border-zinc-800 rounded-lg p-3 mb-3">
                    <div className="flex justify-between text-zinc-400">
                      <span>Subtotal</span>
                      <span className="font-mono">{formatPriceInCurrency(modalPlanTax.subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>GST ({INDIAN_RESTAURANT_GST_PERCENT}%)</span>
                      <span className="font-mono">{formatPriceInCurrency(modalPlanTax.gstAmount, currency)}</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handleCreateSubscription(modalPlan, mealRotations)}
                  disabled={subLoading || !subName.trim() || !subPhone.trim() || !modalPlanTax}
                  className="w-full bg-white text-black py-3.5 rounded font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {subLoading ? <Loader2 className="animate-spin" size={18} /> : (
                    `PAY ${formatPriceInCurrency(modalPlanTax?.total ?? 0, currency)} FOR ${selectedDurationDays} DAYS`
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* === Cart Modal === */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-black h-full shadow-2xl border-l border-zinc-800 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 sm:p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-light tracking-tight text-white">
                Your Order
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
              >
                <X size={24} strokeWidth={1} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="text-center text-zinc-600 mt-32 flex flex-col items-center">
                  <div className="w-16 h-16 border border-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag size={24} strokeWidth={1} />
                  </div>
                  <p className="font-light">Your cart is empty.</p>
                </div>
              ) : (
                cartItemsWithGst.map((item) => (
                  <div
                    key={item.dishId}
                    className="flex justify-between items-start border-b border-zinc-900 pb-4 last:border-0 gap-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white text-lg mb-0.5">
                        {item.name}
                      </p>
                      {item.variantName && (
                        <p className="text-xs text-zinc-500 mb-2">{item.variantName}</p>
                      )}

                      {/* Quantity Editor */}
                      <div className="flex items-center gap-3 bg-zinc-900 w-fit rounded-full px-1 py-1">
                        <button
                          onClick={() => updateQuantity(item.dishId, -1)}
                          className="w-8 h-8 flex items-center justify-center bg-black rounded-full text-white hover:bg-zinc-800 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-mono font-bold text-white w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.dishId, 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:bg-zinc-200 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-white text-lg">
                        {formatPriceInCurrency(item.price * item.quantity, currency)}
                      </p>
                      {showGst && item.gstAmount != null && item.gstAmount > 0 && (
                        <p className="text-xs text-zinc-500 font-mono mt-1">
                          + GST ({INDIAN_RESTAURANT_GST_PERCENT}%): {formatPriceInCurrency(item.gstAmount, currency)}
                        </p>
                      )}
                      {showGst && item.lineTotal != null && (
                        <p className="text-sm text-zinc-300 font-mono mt-0.5">
                          {formatPriceInCurrency(item.lineTotal, currency)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 sm:p-8 border-t border-zinc-900 bg-zinc-950">
              {cart.length > 0 && (
                <div className="mb-4 rounded-xl border border-zinc-600 bg-zinc-900 px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-white" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white mb-1">
                          Delivering to
                        </p>
                        {deliveryAddressSummary ? (
                          <>
                            {customerProfile?.name && (
                              <p className="text-sm text-white font-semibold truncate">{customerProfile.name}</p>
                            )}
                            <p className="text-xs text-zinc-200 leading-snug mt-0.5 line-clamp-3">
                              {deliveryAddressSummary}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-zinc-200 leading-snug">
                            Add a delivery address before you pay.
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAddAddress()}
                      className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-white underline underline-offset-2 hover:text-zinc-300"
                    >
                      {deliveryAddressSummary ? "Edit" : "Add"}
                    </button>
                  </div>
                  {addressActionError && (
                    <p className="mt-2 text-xs text-red-400">{addressActionError}</p>
                  )}
                </div>
              )}
              {showGst && cart.length > 0 && (
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatPriceInCurrency(orderTax.subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>GST ({INDIAN_RESTAURANT_GST_PERCENT}%)</span>
                    <span className="font-mono">{formatPriceInCurrency(orderTax.gstAmount, currency)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 leading-snug">
                    Menu prices exclude GST. {INDIAN_RESTAURANT_GST_PERCENT}% GST applies on restaurant food as per Indian tax law.
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center mb-6">
                <span className="text-zinc-500 uppercase tracking-widest text-xs">
                  Total Amount
                </span>
                <span className="text-3xl font-light text-white">
                  {formatPriceInCurrency(orderTax.total, currency)}
                </span>
              </div>
              <button
                className="w-full bg-white text-black py-4 rounded font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={cart.length === 0 || isOrdering || !deliveryAddressSummary}
                onClick={handleConfirmOrder}
              >
                {isOrdering ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : !deliveryAddressSummary && cart.length > 0 ? (
                  "ADD ADDRESS TO CONTINUE"
                ) : (
                  "CONFIRM ORDER"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
