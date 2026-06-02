import { Check, Flame, Leaf, Plus, RefreshCw, Sparkles, Volume2, VolumeX } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { formatPriceCompactInCurrency } from "@minute-menus/currency";
import type { Dish } from "@minute-menus/types";

interface ReelCardProps {
  dish: Dish;
  onAddToOrder: (dish: Dish) => void;
  currency?: string;
  isSoldOut?: boolean;
  subscriptionBand?: { planName: string; onSubscribe: () => void };
}

const GLASS_PANEL =
  "rounded-2xl border border-white/20 bg-black/35 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)]";

const NutritionCell = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="min-w-0 flex-1 px-2 first:pl-0 last:pr-0">
    <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-white/55 mb-1">
      {icon}
      {label}
    </div>
    <p className="text-[11px] leading-snug text-white/90 line-clamp-3">{value}</p>
  </div>
);

const DishGlassOverlay = ({
  dish,
  currency,
  isSoldOut,
  added,
  subscriptionBand,
  onAdd,
  onSubscribe,
}: {
  dish: Dish;
  currency: string;
  isSoldOut: boolean;
  added: boolean;
  subscriptionBand?: ReelCardProps["subscriptionBand"];
  onAdd: (e: React.MouseEvent) => void;
  onSubscribe: () => void;
}) => {
  const ingredientText = dish.ingredients?.trim() || dish.description?.trim() || "—";
  const benefitText = dish.benefits?.trim() || "—";
  const calorieText =
    dish.calories != null && dish.calories > 0 ? `${dish.calories} kcal` : "—";

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-4 pt-16 pointer-events-none">
      <div className={`${GLASS_PANEL} pointer-events-auto p-3.5 space-y-3`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {dish.categoryTitle && (
              <span className="inline-block mb-1 px-2 py-0.5 rounded-full bg-white/15 text-[9px] font-bold uppercase tracking-wider text-white/80">
                {dish.categoryTitle}
              </span>
            )}
            <h3 className="text-lg font-bold text-white leading-tight">{dish.name}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold text-white">
              {formatPriceCompactInCurrency(dish.price, currency)}
            </p>
            {dish.prepTime > 0 && (
              <p className="text-[9px] text-white/50 font-mono">{dish.prepTime} min</p>
            )}
          </div>
        </div>

        <div className={`${GLASS_PANEL} bg-white/5 border-white/10 p-2.5 flex divide-x divide-white/10`}>
          <NutritionCell icon={<Leaf size={10} />} label="Ingredients" value={ingredientText} />
          <NutritionCell icon={<Sparkles size={10} />} label="Benefits" value={benefitText} />
          <NutritionCell icon={<Flame size={10} />} label="Calories" value={calorieText} />
        </div>

        {subscriptionBand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSubscribe();
            }}
            className="w-full py-2 px-3 rounded-xl bg-white/10 border border-white/15 text-white flex items-center justify-between gap-2 hover:bg-white/15 transition-colors"
          >
            <span className="flex items-center gap-1.5 text-[11px]">
              <RefreshCw size={11} className="text-white/60 shrink-0" />
              Subscribe — <strong>{subscriptionBand.planName}</strong>
            </span>
            <span className="text-[9px] text-white/50 tracking-widest uppercase shrink-0">Plan →</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAdd}
          disabled={isSoldOut}
          className={`w-full py-3 rounded-xl font-bold text-[11px] tracking-[0.16em] uppercase transition-all flex items-center justify-center gap-2 ${
            isSoldOut
              ? "bg-white/10 text-white/40 cursor-not-allowed"
              : added
                ? "bg-emerald-400/90 text-black"
                : "bg-white text-black hover:bg-white/90"
          }`}
        >
          {isSoldOut ? (
            "Sold Out"
          ) : added ? (
            <>
              <Check size={15} /> Added
            </>
          ) : (
            <>
              <Plus size={15} /> Add to Order
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export const ReelCard: React.FC<ReelCardProps> = ({
  dish,
  onAddToOrder,
  currency = "USD",
  isSoldOut = false,
  subscriptionBand,
}) => {
  const [added, setAdded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSoldOut) return;
    onAddToOrder(dish);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const transformStyle = dish.mediaTransform
    ? {
        transform: `translate(${dish.mediaTransform.x}%, ${dish.mediaTransform.y}%) scale(${dish.mediaTransform.scale})`,
        transformOrigin: "center center",
      }
    : { transform: "scale(1)", transformOrigin: "center center" };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div className="absolute inset-0 cursor-pointer" onClick={toggleMute}>
        {dish.videoUrl ? (
          <video
            ref={videoRef}
            src={dish.videoUrl}
            poster={dish.imageUrl}
            className="h-full w-full object-cover"
            style={transformStyle}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            className="h-full w-full object-cover"
            style={transformStyle}
          />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/35 pointer-events-none" />

      {dish.videoUrl && (
        <button
          type="button"
          onClick={toggleMute}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/30 backdrop-blur-md border border-white/15 text-white/80"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      )}

      {isSoldOut && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/40">
          <div className="border-2 border-white/60 px-5 py-2 rotate-[-10deg] backdrop-blur-sm bg-black/20">
            <span className="text-white font-black text-xl tracking-[0.25em] uppercase">Sold Out</span>
          </div>
        </div>
      )}

      <DishGlassOverlay
        dish={dish}
        currency={currency}
        isSoldOut={isSoldOut}
        added={added}
        subscriptionBand={subscriptionBand}
        onAdd={handleAdd}
        onSubscribe={() => subscriptionBand?.onSubscribe()}
      />
    </div>
  );
};
