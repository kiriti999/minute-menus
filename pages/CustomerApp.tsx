
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { dataService } from '../mockData'; // Using the new DataService
import { ReelCard } from '../components/ReelCard';
import { Dish, OrderItem } from '../types';
import { ShoppingBag, X, ChevronDown, Minus, Plus, Loader2 } from 'lucide-react';

interface CustomerAppProps {
  onNavigateToDashboard: () => void;
}

export const CustomerApp: React.FC<CustomerAppProps> = ({ onNavigateToDashboard }) => {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [activeDishIndex, setActiveDishIndex] = useState(0);
  const [isOrdering, setIsOrdering] = useState(false);
  
  // Tracking "Time to Order"
  const [sessionStartTime] = useState<number>(Date.now());
  
  // Load menu from service to ensure we see owner's changes
  const menuCategories = useMemo(() => dataService.getMenu(), []);

  // Flatten the menu structure for continuous vertical scrolling
  // STRICT LIMIT: Limit to first 10 items only as per requirements.
  const flatDishes = useMemo(() => 
    menuCategories.flatMap(cat => cat.items).slice(0, 10), 
  [menuCategories]);
  
  const containerRef = useRef<HTMLDivElement>(null);

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

          dataService.recordWatchSession({
              reelId: dish.id,
              startTime: startTimeRef.current,
              duration: durationSec,
              completed: isCompleted,
              timestamp: Date.now()
          });
      }
  };
  // ---------------------------

  const handleAddToOrder = (dish: Dish) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.dishId === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.dishId === dish.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { dishId: dish.id, quantity: 1, name: dish.name, price: dish.price }];
    });
  };

  const updateQuantity = (dishId: string, delta: number) => {
      setCart(prev => prev.map(item => {
          if (item.dishId === dishId) {
              return { ...item, quantity: Math.max(0, item.quantity + delta) };
          }
          return item;
      }).filter(item => item.quantity > 0));
  };

  const handleConfirmOrder = async () => {
      setIsOrdering(true);
      // Calculate time spent from app open to order confirmation
      const timeToOrder = (Date.now() - sessionStartTime) / 1000;
      
      // Simulate network delay
      setTimeout(() => {
          dataService.recordOrder(cart, timeToOrder);
          setCart([]);
          setIsOrdering(false);
          setIsCartOpen(false);
          alert("Order sent to kitchen! Thanks for dining with us.");
      }, 1500);
  }

  const total = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  // Scroll Handling for Active Category Detection & Haptics
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const height = e.currentTarget.clientHeight;
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / height);

    // Update Active Dish Index for tracking
    if (index !== activeDishIndex) {
        // Record previous dish before switching
        recordSession(activeDishIndex);
        setActiveDishIndex(index);
    }

    if (flatDishes[index]) {
        const currentDish = flatDishes[index];
        const newCatIndex = menuCategories.findIndex(c => c.id === currentDish.category);
        
        if (newCatIndex !== -1 && newCatIndex !== activeCategoryIndex) {
            setActiveCategoryIndex(newCatIndex);
            // Trigger Haptic Feedback on Category Change
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(50);
            }
        }
    }
  };

  const scrollToCategory = (index: number) => {
    const catId = menuCategories[index].id;
    const dishIndex = flatDishes.findIndex(d => d.category === catId);
    
    if (containerRef.current && dishIndex !== -1) {
      containerRef.current.scrollTo({
        top: dishIndex * containerRef.current.clientHeight,
        behavior: 'smooth'
      });
    }
  };

  const scrollNext = () => {
      if (containerRef.current) {
          const h = containerRef.current.clientHeight;
          containerRef.current.scrollBy({ top: h, behavior: 'smooth' });
      }
  };

  return (
    <div className="h-screen w-full bg-black text-white overflow-hidden font-sans relative">
      
      {/* === Header & Tabs === */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col pointer-events-none">
        
        {/* Top Bar: Logo & Cart */}
        <div className="flex justify-between items-start p-5 w-full bg-gradient-to-b from-black/80 to-transparent">
            <button 
                onClick={onNavigateToDashboard}
                className="flex items-center gap-2 group cursor-pointer pointer-events-auto hover:opacity-80 transition-opacity"
            >
                <div className="w-8 h-8 bg-white rounded flex items-center justify-center group-hover:bg-zinc-200 transition-colors shadow-lg">
                    <span className="font-bold text-black text-sm">M</span>
                </div>
                <span className="font-bold tracking-widest text-xs drop-shadow-md text-white mix-blend-difference">MINUTE MENUS</span>
            </button>

            <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-3 pointer-events-auto group transition-transform active:scale-95"
            >
            <div className="bg-black/40 backdrop-blur-md p-2.5 rounded-full border border-white/20 hover:bg-black/60 transition-colors shadow-lg">
                <ShoppingBag size={20} className="text-white" />
            </div>
            {itemCount > 0 && (
                <span className="absolute top-2 right-2 bg-white text-black text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-black">
                {itemCount}
                </span>
            )}
            </button>
        </div>

        {/* Category Tabs (Centered) */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-2 md:gap-4 pointer-events-auto">
            {menuCategories.map((cat, idx) => (
                <button
                    key={cat.id}
                    onClick={() => scrollToCategory(idx)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-300 backdrop-blur-md border shadow-lg ${
                        activeCategoryIndex === idx 
                        ? 'bg-white text-black border-white scale-105' 
                        : 'bg-black/40 text-white/60 border-white/10 hover:bg-black/60'
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
                style={{ scrollSnapStop: 'always' }}
             >
                 <ReelCard dish={dish} onAddToOrder={handleAddToOrder} />
                 
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
                <p className="text-xs uppercase tracking-widest mb-2 font-bold text-zinc-400">End of Menu</p>
                <p className="text-[10px] text-zinc-600 mb-4">You have seen all our signature items</p>
                <div className="w-8 h-[1px] bg-zinc-800 mx-auto"></div>
            </div>
         </div>
      </div>

      {/* === Cart Modal === */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-black h-full shadow-2xl border-l border-zinc-800 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-light tracking-tight text-white">Your Order</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
                <X size={24} strokeWidth={1} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="text-center text-zinc-600 mt-32 flex flex-col items-center">
                  <div className="w-16 h-16 border border-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag size={24} strokeWidth={1} />
                  </div>
                  <p className="font-light">Your cart is empty.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.dishId} className="flex justify-between items-center border-b border-zinc-900 pb-4 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-white text-lg mb-2">{item.name}</p>
                      
                      {/* Quantity Editor */}
                      <div className="flex items-center gap-3 bg-zinc-900 w-fit rounded-full px-1 py-1">
                         <button 
                            onClick={() => updateQuantity(item.dishId, -1)}
                            className="w-8 h-8 flex items-center justify-center bg-black rounded-full text-white hover:bg-zinc-800 transition-colors"
                         >
                             <Minus size={14} />
                         </button>
                         <span className="text-sm font-mono font-bold text-white w-4 text-center">{item.quantity}</span>
                         <button 
                            onClick={() => updateQuantity(item.dishId, 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:bg-zinc-200 transition-colors"
                         >
                             <Plus size={14} />
                         </button>
                      </div>

                    </div>
                    <p className="font-mono text-white text-lg">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-8 border-t border-zinc-900 bg-zinc-950">
              <div className="flex justify-between items-center mb-6">
                <span className="text-zinc-500 uppercase tracking-widest text-xs">Total Amount</span>
                <span className="text-3xl font-light text-white">${total.toFixed(2)}</span>
              </div>
              <button 
                className="w-full bg-white text-black py-4 rounded font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={cart.length === 0 || isOrdering}
                onClick={handleConfirmOrder}
              >
                {isOrdering ? <Loader2 className="animate-spin" size={18} /> : "CONFIRM ORDER"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
