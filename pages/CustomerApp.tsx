import {
  AlertTriangle,
  Bookmark,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
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
  calculateMealPlanTax,
  calculateOrderTax,
  enrichOrderItemsWithGst,
  formatPriceInCurrency,
  INDIAN_RESTAURANT_GST_PERCENT,
  isIndianGstApplicable,
} from "@minute-menus/currency";
import { isDishSoldOut, MenuGridCard, MenuListCard } from "@minute-menus/reels";
import { supabaseService } from "../services/supabaseService";
import { supabase } from "../lib/supabase";
import { formatDisplayName } from "../lib/formatDisplayName";
import { openRazorpayCheckout } from "../lib/loadRazorpayCheckout";
import { PAYMENT_API_PATHS } from "../lib/api/paymentRouteRewrites";
import { ButtonSpinner } from "@minute-menus/ui";
import type { Category, CustomerAddress, CustomerProfile, CustomerSubscription, DailyOrder, Dish, MealPlan, OrderItem, SubDeliveryType, DeliveryFeeMode, TicketReason, TimeSlot } from "@minute-menus/types";
import { TICKET_REASON_LABELS, TIME_SLOT_LABELS } from "@minute-menus/types";
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
}) => {
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>("auth");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
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
  type SubView = "lookup" | "plans" | "subscribe" | "manage";
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [subView, setSubView] = useState<SubView>("lookup");
  const [subPhone, setSubPhone] = useState("");
  const [subName, setSubName] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subDeliveryType, setSubDeliveryType] = useState<SubDeliveryType>("delivery");
  const [subDeliveryFeeMode, setSubDeliveryFeeMode] = useState<DeliveryFeeMode>("cash_on_delivery");
  const [subTimeSlot, setSubTimeSlot] = useState<TimeSlot>("08-09");
  const [availablePlans, setAvailablePlans] = useState<MealPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
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
  const [rotationDishIds, setRotationDishIds] = useState<string[]>([]);
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

  // Product limit removed for multi-category restaurant menus — show all categories.
  const displayCategories = menuCategories;

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
        },
        restaurantId ?? undefined,
      );
    }
  };
  // ---------------------------

  const handleAddToOrder = (dish: Dish) => {
    if (dish.manualSoldOut) return;
    const currentCartQty = cart.find((i) => i.dishId === dish.id)?.quantity ?? 0;
    const soldQty = soldCounts[dish.id] ?? 0;
    if (
      dish.stockQuantity != null &&
      currentCartQty + soldQty >= dish.stockQuantity
    ) {
      return; // already at or over limit
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.dishId === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.dishId === dish.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        { dishId: dish.id, quantity: 1, name: dish.name, price: dish.price },
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

  /** Google locate only fills area + pincode; building/flat/street stay manual. */
  const applyLocatedAddress = (address: CustomerAddress) => {
    if (address.area) setDetailsArea(address.area);
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

    setAuthLoading(true);
    setAuthError("");
    try {
      const customer = await supabaseService.getCurrentCustomer();
      if (!customer) throw new Error("Not logged in");

      await supabaseService.updateCustomerProfile(customer.userId, {
        name: detailsName.trim(),
        phone: detailsPhone.trim(),
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

  const handleCustomerSignOut = async () => {
    await supabaseService.customerSignOut();
    setCustomerProfile(null);
    setAuthEmail("");
    setAuthPassword("");
    setOtpCode("");
    setDetailsName("");
    setDetailsPhone("");
    setDetailsAddressLine1("");
    setDetailsAddressLine2("");
    setDetailsStreet("");
    setDetailsArea("");
    setDetailsLandmark("");
    setDetailsCity("");
    setDetailsState(DEFAULT_DELIVERY_STATE);
    setDetailsPincode("");
    setDetailsLat(undefined);
    setDetailsLng(undefined);
    setDetailsFormattedAddress("");
  };

  const processOrderPayment = async (profile: CustomerProfile) => {
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

      const confirmRes = await fetch(PAYMENT_API_PATHS.confirmOrder, {
        method: "POST",
        headers: { "content-type": "application/json" },
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
  const selectedPlanTax = useMemo(() => {
    if (!selectedPlan) return null;
    return calculateMealPlanTax(
      selectedPlan.priceMonthly,
      selectedPlan.deliveryFee,
      subDeliveryType,
      subDeliveryFeeMode,
      currency,
    );
  }, [selectedPlan, subDeliveryType, subDeliveryFeeMode, currency]);
  const modalPlanTax = useMemo(() => {
    if (!modalPlan) return null;
    return calculateMealPlanTax(
      modalPlan.priceMonthly,
      modalPlan.deliveryFee,
      subDeliveryType,
      subDeliveryFeeMode,
      currency,
    );
  }, [modalPlan, subDeliveryType, subDeliveryFeeMode, currency]);
  const itemCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart],
  );
  const cartQtyByDish = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) map[item.dishId] = item.quantity;
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
    date > tomorrowDate() || (date === tomorrowDate() && !isPastCutoff());

  const getRotationDishForDate = (date: string): Dish | undefined => {
    const ids = customerSub?.rotationDishIds ?? [];
    if (!ids.length || !customerSub) return planDishes[0];
    const msPerDay = 86400000;
    const dayIndex = Math.floor((new Date(date).getTime() - new Date(customerSub.startDate).getTime()) / msPerDay);
    const idx = ((dayIndex % ids.length) + ids.length) % ids.length;
    return planDishes.find(d => d.id === ids[idx]);
  };

  const loadDishesForPlan = (plan: MealPlan) => {
    const dishes = menuCategories.flatMap((c) => c.items).filter((d) => plan.dishIds.includes(d.id));
    setPlanDishes(dishes);
  };

  const openSubPanel = async () => {
    setSubView("lookup");
    setSubError("");
    setIsSubOpen(true);
    // Pre-load plans so new customers see them without needing to look up first
    if (restaurantId) {
      try {
        const plans = await supabaseService.getMealPlans(restaurantId);
        setAvailablePlans(plans.filter((p) => p.isActive));
      } catch { /* non-fatal — plans will load on lookup */ }
    }
  };

  const openMealPlanModal = async (dish: Dish) => {
    // Ensure plans are loaded first
    let plans = availablePlans;
    if (!plans.length && restaurantId) {
      try {
        const fetched = await supabaseService.getMealPlans(restaurantId);
        plans = fetched.filter(p => p.isActive);
        setAvailablePlans(plans);
      } catch { return; }
    }
    const plan = plans.find(p => p.dishIds.includes(dish.id));
    if (!plan) return;
    setModalPlan(plan);
    setRotationDishIds([dish.id]);
    setModalStep(1);
    setIsMealPlanModalOpen(true);
  };

  const closeMealPlanModal = () => {
    setIsMealPlanModalOpen(false);
    setModalPlan(null);
    setRotationDishIds([]);
    setModalStep(1);
  };

  const toggleRotationDish = (dishId: string) => {
    setRotationDishIds(prev =>
      prev.includes(dishId) ? prev.filter(id => id !== dishId) : [...prev, dishId]
    );
  };

  const handleSubLookup = async () => {
    if (!subPhone.trim() || !restaurantId) return;
    setSubLoading(true);
    setSubError("");
    try {
      const sub = await supabaseService.getCustomerSubscription(subPhone.trim(), restaurantId);
      if (sub) {
        setCustomerSub(sub);
        const orders = await supabaseService.getCustomerDailyOrders(sub.id, tomorrowDate());
        setDailyOrders(orders);
        const plans = await supabaseService.getMealPlans(restaurantId);
        setAvailablePlans(plans.filter((p) => p.isActive));
        const plan = plans.find((p) => p.id === sub.planId);
        if (plan) loadDishesForPlan(plan);
        setSubView("manage");
      } else {
        const plans = await supabaseService.getMealPlans(restaurantId);
        setAvailablePlans(plans.filter((p) => p.isActive));
        setSubView("plans");
      }
    } catch {
      setSubError("Failed to look up subscription. Please try again.");
    } finally {
      setSubLoading(false);
    }
  };

  const handleSelectPlan = (plan: MealPlan) => {
    setSelectedPlan(plan);
    loadDishesForPlan(plan);
    setSubView("subscribe");
  };

  const handleCreateSubscription = async (planOverride?: MealPlan, rotationOverride?: string[]) => {
    const plan = planOverride ?? selectedPlan;
    const rotation = rotationOverride ?? [];
    if (!subPhone.trim() || !subName.trim() || !plan || !restaurantId) return;
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
          deliveryFeeMode: subDeliveryFeeMode,
          deliveryType: subDeliveryType,
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
          timeSlot: subTimeSlot,
          rotationDishIds: rotation.length ? rotation : undefined,
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
      if (planOverride) {
        // Came from the meal plan modal — close it and open manage in side panel
        closeMealPlanModal();
        setIsSubOpen(true);
      }
      setSubView("manage");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to subscribe. Please try again.";
      if (msg !== "Payment cancelled") setSubError(msg);
    } finally {
      setSubLoading(false);
    }
  };

  const handleSelectDish = async (dishId: string) => {
    if (!subPhone.trim() || !restaurantId || !customerSub) return;
    setSubLoading(true);
    try {
      await supabaseService.selectDailyDish(subPhone.trim(), restaurantId, selectedScheduleDate, dishId);
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
    <div className={`h-screen w-full ${isDarkTheme ? 'bg-black text-white' : 'bg-white text-black'} overflow-hidden font-sans relative transition-colors duration-300`}>
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
                {displayRestaurantName ? displayRestaurantName.charAt(0) : "M"}
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
                onClick={handleCustomerSignOut}
                className={`p-2.5 rounded-full backdrop-blur-md border transition-colors shadow-lg ${isDarkTheme ? 'bg-black/40 border-white/20 hover:bg-black/60' : 'bg-white/40 border-black/20 hover:bg-white/60'}`}
                title={`Signed in as ${customerProfile.email} — tap to sign out`}
              >
                <User size={18} className={isDarkTheme ? 'text-white' : 'text-zinc-800'} />
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
      </div>

      {!menuLoading && displayCategories.length > 0 && (
        <div
          ref={categoryNavRef}
          className={`fixed top-[4.5rem] sm:top-20 left-0 right-0 z-40 pointer-events-none ${
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
      )}

      {/* === Menu browse === */}
      <div
        ref={containerRef}
        className={`h-full w-full overflow-y-auto overscroll-contain scroll-smooth pt-[7.5rem] sm:pt-[8.5rem] pb-24 ${isDarkTheme ? "bg-zinc-950" : "bg-white"}`}
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
                  className={`scroll-mt-[7.5rem] sm:scroll-mt-[8.5rem] ${
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
                        onAdd={handleAddToOrder}
                        isDarkTheme={isDarkTheme}
                        quantity={cartQtyByDish[dish.id] ?? 0}
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
                        onAdd={handleAddToOrder}
                        isDarkTheme={isDarkTheme}
                        quantity={cartQtyByDish[dish.id] ?? 0}
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
                          onChange={(e) => setDetailsPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full bg-zinc-900 border border-zinc-700 text-white pl-10 pr-4 py-2.5 rounded text-sm outline-none focus:border-zinc-500 transition-colors"
                        />
                      </div>
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
                  onClick={() => setSubView(subView === "subscribe" ? "plans" : "lookup")}
                  className="p-1.5 hover:bg-zinc-900 rounded-full transition-colors"
                >
                  <ChevronLeft size={20} className="text-zinc-400" />
                </button>
              )}
              <h2 className="text-xl font-light tracking-tight text-white flex-1">
                {subView === "lookup" && "My Subscription"}
                {subView === "plans" && "Choose a Plan"}
                {subView === "subscribe" && (selectedPlan?.name ?? "Subscribe")}
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
                        <span className="font-mono text-white text-lg shrink-0">{currency} {plan.priceMonthly}<span className="text-zinc-500 text-sm">/mo</span></span>
                      </div>
                      {plan.description && <p className="text-zinc-400 text-sm mb-3">{plan.description}</p>}
                      <div className="flex gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Tag size={11} /> {plan.dishIds.length} dishes</span>
                        <span className="flex items-center gap-1"><CreditCard size={11} /> {plan.deliveryFee > 0 ? `+${currency} ${plan.deliveryFee} delivery` : "Free delivery"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Subscribe form view ── */}
              {subView === "subscribe" && selectedPlan && (
                <div className="space-y-5 mt-2">
                  {([{ label: "Your Name", key: "name", type: "text", value: subName, set: setSubName, placeholder: "Full name" },
                  { label: "Email (optional)", key: "email", type: "email", value: subEmail, set: setSubEmail, placeholder: "for order confirmations" },
                  ] as const).map(({ label, type, value, set, placeholder }) => (
                    <div key={label}>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-zinc-500">{label}</label>
                      <input type={type} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder}
                        className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-2.5 rounded text-sm outline-none focus:border-zinc-500" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-zinc-500">Delivery Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["delivery", "pickup"] as SubDeliveryType[]).map((t) => (
                        <button key={t} onClick={() => setSubDeliveryType(t)}
                          className={`py-2.5 rounded border text-sm font-medium capitalize transition-colors ${subDeliveryType === t ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                    {subDeliveryType === "delivery" && selectedPlan.deliveryFee > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Delivery fee — {currency} {selectedPlan.deliveryFee}/order</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(["cash_on_delivery", "upfront"] as DeliveryFeeMode[]).map((mode) => (
                            <button key={mode} onClick={() => setSubDeliveryFeeMode(mode)}
                              className={`py-2 rounded border text-xs font-medium transition-colors ${subDeliveryFeeMode === mode ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                              {mode === "upfront" ? `Pay upfront (+${currency} ${selectedPlan.deliveryFee * 30}/mo)` : "Pay on delivery"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-zinc-500">Delivery Time Slot</label>
                    <div className="space-y-2">
                      {(Object.entries(TIME_SLOT_LABELS) as [TimeSlot, string][]).map(([slot, label]) => (
                        <button key={slot} onClick={() => setSubTimeSlot(slot)}
                          className={`w-full py-2.5 px-4 rounded border text-sm text-left flex items-center gap-2 transition-colors ${subTimeSlot === slot ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                          <Clock size={14} />{label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {subError && <p className="text-red-400 text-sm">{subError}</p>}
                  {showGst && selectedPlanTax && (
                    <div className="space-y-1.5 text-sm border border-zinc-800 rounded-lg p-3">
                      <div className="flex justify-between text-zinc-400">
                        <span>Subtotal</span>
                        <span className="font-mono">{formatPriceInCurrency(selectedPlanTax.subtotal, currency)}/mo</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>GST ({INDIAN_RESTAURANT_GST_PERCENT}%)</span>
                        <span className="font-mono">{formatPriceInCurrency(selectedPlanTax.gstAmount, currency)}/mo</span>
                      </div>
                      <p className="text-[10px] text-zinc-600 leading-snug">
                        Plan prices exclude GST. {INDIAN_RESTAURANT_GST_PERCENT}% GST applies on meal plans as per Indian tax law.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => handleCreateSubscription()}
                    disabled={subLoading || !subName.trim()}
                    className="w-full bg-white text-black py-3.5 rounded font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {subLoading ? <Loader2 className="animate-spin" size={18} /> : (
                      `PAY ${formatPriceInCurrency(selectedPlanTax?.total ?? selectedPlan.priceMonthly, currency)}/mo`
                    )}
                  </button>
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
                    <p className="text-zinc-500 text-xs">{customerSub.deliveryType} · {TIME_SLOT_LABELS[customerSub.timeSlot]}</p>
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
                          const overrideOrder = dailyOrders.find(o => o.deliveryDate === dateStr);
                          const rotationDish = getRotationDishForDate(dateStr);
                          const dishLabel = overrideOrder?.dishName ?? rotationDish?.name ?? "—";
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
                              <span className="text-[9px] leading-tight truncate max-w-[44px]">{dishLabel}</span>
                              {overrideOrder?.dishId && <span className="text-[8px] opacity-60">override</span>}
                            </button>
                          );
                        })}
                      </div>

                      {/* Dish selector for selected date */}
                      {isDateModifiable(selectedScheduleDate) ? (
                        <div className="space-y-2">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                            Dish for {new Date(selectedScheduleDate + "T00:00:00").toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
                          </p>
                          {planDishes.map(dish => {
                            const orderForDate = dailyOrders.find(o => o.deliveryDate === selectedScheduleDate);
                            const rotationDish = getRotationDishForDate(selectedScheduleDate);
                            const isActive = orderForDate ? orderForDate.dishId === dish.id : rotationDish?.id === dish.id;
                            return (
                              <button key={dish.id}
                                onClick={() => handleSelectDish(dish.id)}
                                disabled={subLoading}
                                className={`w-full text-left px-4 py-3 rounded border flex items-center justify-between transition-colors ${isActive ? "bg-white text-black border-white" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"}`}>
                                <span className="font-medium text-sm">{dish.name}</span>
                                <div className="flex items-center gap-2">
                                  {!dailyOrders.find(o => o.deliveryDate === selectedScheduleDate) && isActive && (
                                    <span className="text-[10px] opacity-60">rotation</span>
                                  )}
                                  {isActive && <Check size={14} />}
                                </div>
                              </button>
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
                <p className="text-zinc-400 text-sm">Select the dishes you want in your daily rotation. They'll be delivered in order, cycling automatically.</p>
                <div className="space-y-2">
                  {modalPlanDishes.map(dish => {
                    const isSelected = rotationDishIds.includes(dish.id);
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
                {rotationDishIds.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Rotation Preview</p>
                    <div className="space-y-1">
                      {Array.from({ length: Math.min(7, rotationDishIds.length * 2) }, (_, i) => {
                        const dishId = rotationDishIds[i % rotationDishIds.length];
                        const d = modalPlanDishes.find(x => x.id === dishId);
                        const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7];
                        return d ? (
                          <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className="w-8 text-zinc-600 font-mono">{dayLabel}</span>
                            <span className="text-white">{d.name}</span>
                            {rotationDishIds.length > 1 && i >= rotationDishIds.length && (
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
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Delivery fee — {currency} {modalPlan.deliveryFee}/order</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["cash_on_delivery", "upfront"] as DeliveryFeeMode[]).map(mode => (
                          <button key={mode} onClick={() => setSubDeliveryFeeMode(mode)}
                            className={`py-2 rounded border text-xs font-medium transition-colors ${subDeliveryFeeMode === mode ? "bg-white text-black border-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                            {mode === "upfront" ? `Pay upfront (+${currency} ${modalPlan.deliveryFee * 30}/mo)` : "Pay on delivery"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-zinc-500">Delivery Time Slot</label>
                  <div className="space-y-2">
                    {(Object.entries(TIME_SLOT_LABELS) as [TimeSlot, string][]).map(([slot, label]) => (
                      <button key={slot} onClick={() => setSubTimeSlot(slot)}
                        className={`w-full py-2.5 px-4 rounded border text-sm text-left flex items-center gap-2 transition-colors ${subTimeSlot === slot ? "bg-white text-black border-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                        <Clock size={14} />{label}
                      </button>
                    ))}
                  </div>
                </div>
                {subError && <p className="text-red-400 text-sm">{subError}</p>}
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div className="p-4 border-t border-zinc-800 shrink-0">
            {modalStep === 1 ? (
              <button
                onClick={() => setModalStep(2)}
                disabled={rotationDishIds.length === 0}
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
                      <span className="font-mono">{formatPriceInCurrency(modalPlanTax.subtotal, currency)}/mo</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>GST ({INDIAN_RESTAURANT_GST_PERCENT}%)</span>
                      <span className="font-mono">{formatPriceInCurrency(modalPlanTax.gstAmount, currency)}/mo</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handleCreateSubscription(modalPlan, rotationDishIds)}
                  disabled={subLoading || !subName.trim() || !subPhone.trim()}
                  className="w-full bg-white text-black py-3.5 rounded font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {subLoading ? <Loader2 className="animate-spin" size={18} /> : (
                    `PAY ${formatPriceInCurrency(modalPlanTax?.total ?? modalPlan.priceMonthly, currency)}/mo`
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
                      <p className="font-medium text-white text-lg mb-2">
                        {item.name}
                      </p>

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
                      onClick={() => {
                        if (!customerProfile) {
                          setDetailsPurpose("checkout");
                          setAuthStep("auth");
                          setAuthError("");
                          setIsAuthModalOpen(true);
                          return;
                        }
                        openDeliveryDetails(
                          supabaseService.isProfileComplete(customerProfile) ? "edit" : "checkout",
                          customerProfile,
                        );
                      }}
                      className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-white underline underline-offset-2 hover:text-zinc-300"
                    >
                      {deliveryAddressSummary ? "Edit" : "Add"}
                    </button>
                  </div>
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
                disabled={cart.length === 0 || isOrdering}
                onClick={handleConfirmOrder}
              >
                {isOrdering ? (
                  <Loader2 className="animate-spin" size={18} />
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
