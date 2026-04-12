import {
  AlertTriangle,
  Bookmark,
  Calendar,
  ChevronDown,
  ChevronLeft,
  Clock,
  CreditCard,
  Loader2,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  ShoppingBag,
  Sun,
  Tag,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReelCard } from "../components/ReelCard";
import { formatPriceInCurrency } from "../lib/currency";
import { supabaseService } from "../services/supabaseService";
import type { Category, CustomerSubscription, DailyOrder, Dish, MealPlan, OrderItem, SubDeliveryType, TicketReason, TimeSlot } from "../types";
import { TICKET_REASON_LABELS, TIME_SLOT_LABELS } from "../types";

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

export const CustomerApp: React.FC<CustomerAppProps> = ({
  onNavigateToDashboard,
  isDarkTheme,
  onToggleTheme,
  restaurantSlug,
  restaurantId,
  restaurantName,
  currency = "USD",
}) => {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [activeDishIndex, setActiveDishIndex] = useState(0);
  const [isOrdering, setIsOrdering] = useState(false);
  const [soldCounts, setSoldCounts] = useState<Record<string, number>>({});

  // ── Subscription state ──────────────────────────────────────────────
  type SubView = "lookup" | "plans" | "subscribe" | "manage";
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [subView, setSubView] = useState<SubView>("lookup");
  const [subPhone, setSubPhone] = useState("");
  const [subName, setSubName] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subDeliveryType, setSubDeliveryType] = useState<SubDeliveryType>("delivery");
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
    ])
      .then(([menu, counts]) => {
        setMenuCategories(menu);
        setSoldCounts(counts);
      })
      .catch(console.error)
      .finally(() => setMenuLoading(false));
  }, [restaurantId]);

  // Flatten the menu structure for continuous vertical scrolling
  // STRICT LIMIT: Limit to first 10 items only as per requirements.
  const flatDishes = useMemo(
    () => menuCategories.flatMap((cat) => cat.items).slice(0, 10),
    [menuCategories],
  );

  const containerRef = useRef<HTMLDivElement>(null);

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
    // Reset timer when active dish changes
    startTimeRef.current = Date.now();

    return () => {
      // On unmount or change, record the session
      recordSession(activeDishIndex);
    };
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

  const handleConfirmOrder = async () => {
    setIsOrdering(true);
    const timeToOrder = (Date.now() - sessionStartTime) / 1000;

    setTimeout(() => {
      // Calculate which dishes just hit their stock limit from this order
      const newlySoldOut = cart
        .map((item) => {
          const dish = flatDishes.find((d) => d.id === item.dishId);
          if (!dish || dish.stockQuantity == null) return null;
          const prevSold = soldCounts[item.dishId] ?? 0;
          const afterSold = prevSold + item.quantity;
          const wasAlreadySoldOut = prevSold >= dish.stockQuantity;
          const isNowSoldOut = afterSold >= dish.stockQuantity;
          if (isNowSoldOut && !wasAlreadySoldOut) {
            return { id: dish.id, name: dish.name };
          }
          return null;
        })
        .filter((d): d is { id: string; name: string } => d !== null);

      supabaseService.recordOrder(
        cart,
        timeToOrder,
        restaurantId ?? undefined,
        newlySoldOut.length > 0 ? newlySoldOut : undefined,
      );

      // Update local sold counts so sold-out state reflects immediately
      setSoldCounts((prev) => {
        const updated = { ...prev };
        cart.forEach((item) => {
          updated[item.dishId] = (updated[item.dishId] ?? 0) + item.quantity;
        });
        return updated;
      });
      setCart([]);
      setIsOrdering(false);
      setIsCartOpen(false);
      alert("Order sent to kitchen! Thanks for dining with us.");
    }, 1500);
  };

  const total = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cart],
  );
  const itemCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart],
  );

  // Scroll Handling for Active Category Detection & Haptics
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const height = e.currentTarget.clientHeight;
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / height);

    // Update Active Dish Index for tracking
    // recordSession is called by the useEffect cleanup when activeDishIndex changes
    if (index !== activeDishIndex) {
      setActiveDishIndex(index);
    }

    if (flatDishes[index]) {
      const currentDish = flatDishes[index];
      const newCatIndex = menuCategories.findIndex(
        (c) => c.id === currentDish.category,
      );

      if (newCatIndex !== -1 && newCatIndex !== activeCategoryIndex) {
        setActiveCategoryIndex(newCatIndex);
        // Trigger Haptic Feedback on Category Change
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }
  };

  const scrollToCategory = (index: number) => {
    const catId = menuCategories[index].id;
    const dishIndex = flatDishes.findIndex((d) => d.category === catId);

    if (containerRef.current && dishIndex !== -1) {
      containerRef.current.scrollTo({
        top: dishIndex * containerRef.current.clientHeight,
        behavior: "smooth",
      });
    }
  };

  // ── Subscription helpers ──────────────────────────────────────────
  const isPastCutoff = () => {
    const now = new Date();
    return now.getUTCHours() > 11 || (now.getUTCHours() === 11 && now.getUTCMinutes() >= 30);
  };

  const tomorrowDate = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const loadDishesForPlan = (plan: MealPlan) => {
    const dishes = menuCategories.flatMap((c) => c.items).filter((d) => plan.dishIds.includes(d.id));
    setPlanDishes(dishes);
  };

  const openSubPanel = async () => {
    setSubView("lookup");
    setSubError("");
    setIsSubOpen(true);
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

  const handleCreateSubscription = async () => {
    if (!subPhone.trim() || !subName.trim() || !selectedPlan || !restaurantId) return;
    setSubLoading(true);
    setSubError("");
    try {
      await supabaseService.createCustomerSubscription({
        restaurantId,
        planId: selectedPlan.id,
        customerName: subName.trim(),
        phone: subPhone.trim(),
        email: subEmail.trim() || undefined,
        deliveryType: subDeliveryType,
        timeSlot: subTimeSlot,
      });
      const newSub = await supabaseService.getCustomerSubscription(subPhone.trim(), restaurantId);
      setCustomerSub(newSub);
      setDailyOrders([]);
      setSubView("manage");
    } catch (e) {
      setSubError(e instanceof Error ? e.message : "Failed to subscribe. Please try again.");
    } finally {
      setSubLoading(false);
    }
  };

  const handleSelectDish = async (dishId: string) => {
    if (!subPhone.trim() || !restaurantId || !customerSub) return;
    setSubLoading(true);
    try {
      await supabaseService.selectDailyDish(subPhone.trim(), restaurantId, tomorrowDate(), dishId);
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

  const scrollNext = () => {
    if (containerRef.current) {
      const h = containerRef.current.clientHeight;
      containerRef.current.scrollBy({ top: h, behavior: "smooth" });
    }
  };

  return (
    <div className={`h-screen w-full ${isDarkTheme ? 'bg-black text-white' : 'bg-white text-black'} overflow-hidden font-sans relative transition-colors duration-300`}>
      {/* === Header & Tabs === */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col pointer-events-none">
        {/* Top Bar: Logo & Cart */}
        <div className={`flex justify-between items-start p-3 sm:p-5 w-full bg-gradient-to-b ${isDarkTheme ? 'from-black/80' : 'from-white/80'} to-transparent`}>
          <button
            onClick={onNavigateToDashboard}
            className="flex items-center gap-2 group cursor-pointer pointer-events-auto hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center group-hover:bg-zinc-200 transition-colors shadow-lg">
              <span className="font-bold text-black text-sm">
                {restaurantName ? restaurantName.charAt(0).toUpperCase() : "M"}
              </span>
            </div>
            <span className="font-bold tracking-widest text-xs drop-shadow-md text-white mix-blend-difference">
              {restaurantName ?? "MINUTE MENUS"}
            </span>
          </button>

          <div className="flex items-center gap-2 pointer-events-auto">
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
              <div className="bg-black/40 backdrop-blur-md p-2.5 rounded-full border border-white/20 hover:bg-black/60 transition-colors shadow-lg">
                <ShoppingBag size={20} className="text-white" />
              </div>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-black text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-black">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Category Tabs (Centered) */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-2 md:gap-4 pointer-events-auto max-w-[calc(100vw-10rem)] overflow-x-auto no-scrollbar px-2">
          {menuCategories.map((cat, idx) => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(idx)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-300 backdrop-blur-md border shadow-lg ${activeCategoryIndex === idx
                ? "bg-white text-black border-white scale-105"
                : "bg-black/40 text-white/60 border-white/10 hover:bg-black/60"
                }`}
            >
              {cat.title}
            </button>
          ))}
        </div>
      </div>

      {/* === Main Continuous Vertical Scroll Container === */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar overscroll-contain scroll-smooth touch-pan-y bg-zinc-900"
      >
        {flatDishes.map((dish, idx) => (
          <div
            key={dish.id}
            className="h-full w-full snap-start relative"
            style={{ scrollSnapStop: "always" }}
          >
            <ReelCard
              dish={dish}
              onAddToOrder={handleAddToOrder}
              currency={currency}
              isSoldOut={
                dish.manualSoldOut === true ||
                (
                  dish.stockQuantity != null &&
                  dish.stockQuantity > 0 &&
                  (soldCounts[dish.id] ?? 0) >= dish.stockQuantity
                )
              }
            />

            {/* Hint Arrow (except on last item) */}
            {idx < flatDishes.length - 1 && (
              <button
                onClick={scrollNext}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 p-3 rounded-full bg-black/20 backdrop-blur-sm text-white/70 border border-white/10 animate-bounce hover:bg-black/40 transition-all cursor-pointer pointer-events-auto"
              >
                <ChevronDown size={24} />
              </button>
            )}
          </div>
        ))}

        {/* End of Menu Message */}
        <div className="h-1/3 w-full snap-start flex items-center justify-center bg-zinc-950 text-zinc-500 pb-20">
          <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <span className="text-xl">🎉</span>
            </div>
            <p className="text-xs uppercase tracking-widest mb-2 font-bold text-zinc-400">
              End of Menu
            </p>
            <p className="text-[10px] text-zinc-600 mb-4">
              You have seen all our signature items
            </p>
            <div className="w-8 h-[1px] bg-zinc-800 mx-auto"></div>
          </div>
        </div>
      </div>

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
                  <p className="text-zinc-400 text-sm">Enter your phone number to access or create a subscription for {restaurantName ?? "this restaurant"}.</p>
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
                      <p className="text-xs text-zinc-500 mt-1.5">+{currency} {selectedPlan.deliveryFee} delivery fee will be added</p>
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
                  <button
                    onClick={handleCreateSubscription}
                    disabled={subLoading || !subName.trim()}
                    className="w-full bg-white text-black py-3.5 rounded font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {subLoading ? <Loader2 className="animate-spin" size={18} /> : `SUBSCRIBE — ${currency} ${selectedPlan.priceMonthly}/mo`}
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

                  {/* Tomorrow's dish selection */}
                  {customerSub.status === "active" && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar size={14} className="text-zinc-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Tomorrow's Selection</h3>
                      </div>
                      {isPastCutoff() ? (
                        <p className="text-zinc-500 text-sm">Selection locked — cutoff was 5:00 PM IST. Check back after midnight.</p>
                      ) : (
                        <div className="space-y-2">
                          {(() => {
                            const todayOrder = dailyOrders.find((o) => o.deliveryDate === tomorrowDate());
                            return planDishes.map((dish) => (
                              <button key={dish.id}
                                onClick={() => handleSelectDish(dish.id)}
                                disabled={subLoading}
                                className={`w-full text-left px-4 py-3 rounded border flex items-center justify-between transition-colors ${todayOrder?.dishId === dish.id ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}>
                                <span className="font-medium text-sm">{dish.name}</span>
                                {todayOrder?.dishId === dish.id && <span className="text-xs font-bold">Selected</span>}
                              </button>
                            ));
                          })()}
                          {planDishes.length === 0 && <p className="text-zinc-500 text-sm">No dishes available in your plan.</p>}
                        </div>
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
                cart.map((item) => (
                  <div
                    key={item.dishId}
                    className="flex justify-between items-center border-b border-zinc-900 pb-4 last:border-0"
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
                    <p className="font-mono text-white text-lg">
                      {formatPriceInCurrency(item.price * item.quantity, currency)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 sm:p-8 border-t border-zinc-900 bg-zinc-950">
              <div className="flex justify-between items-center mb-6">
                <span className="text-zinc-500 uppercase tracking-widest text-xs">
                  Total Amount
                </span>
                <span className="text-3xl font-light text-white">
                  {formatPriceInCurrency(total, currency)}
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
