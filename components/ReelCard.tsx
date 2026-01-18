
import React, { useState, useRef } from 'react';
import { Dish } from '../types';
import { Plus, Check, Volume2, VolumeX } from 'lucide-react';

interface ReelCardProps {
  dish: Dish;
  onAddToOrder: (dish: Dish) => void;
}

export const ReelCard: React.FC<ReelCardProps> = ({ dish, onAddToOrder }) => {
  const [added, setAdded] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default muted for autoplay
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling mute when clicking button
    onAddToOrder(dish);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  // Construct transform style
  const transformStyle = dish.mediaTransform
    ? {
        transform: `translate(${dish.mediaTransform.x}%, ${dish.mediaTransform.y}%) scale(${dish.mediaTransform.scale})`,
        transformOrigin: 'center center',
      }
    : {
        transform: 'scale(1)',
        transformOrigin: 'center center',
      };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      
      {/* Media Element Container */}
      <div className="absolute inset-0 w-full h-full cursor-pointer overflow-hidden" onClick={toggleMute}>
        {dish.videoUrl ? (
             <video
                ref={videoRef}
                src={dish.videoUrl}
                poster={dish.imageUrl}
                className="w-full h-full object-cover transition-transform duration-75"
                style={transformStyle}
                autoPlay
                loop
                muted={true} // Start muted by default
                playsInline
            />
        ) : (
            <img 
                src={dish.imageUrl} 
                alt={dish.name}
                className="w-full h-full object-cover transition-transform duration-75"
                style={transformStyle}
            />
        )}
       
        
        {/* Mute Indicator (Only for Video) */}
        {dish.videoUrl && (
             <div className="absolute top-20 right-4 z-30 p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10 text-white/80 transition-opacity hover:bg-black/40">
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </div>
        )}
      </div>
      
      {/* Cinematic Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none" />

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-20 pointer-events-none">
        {/* Price Badge */}
        <div className="flex flex-col items-center">
             <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur border border-white/20 flex items-center justify-center">
                <span className="text-xs font-bold text-white">${Math.floor(dish.price)}</span>
             </div>
             <span className="text-[9px] mt-1 text-white/80 font-mono">PRICE</span>
        </div>
        
        {/* Prep Time */}
        <div className="flex flex-col items-center">
             <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur border border-white/20 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{dish.prepTime}m</span>
             </div>
             <span className="text-[9px] mt-1 text-white/80 font-mono">PREP</span>
        </div>
      </div>

      {/* Content Overlay (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 z-20 flex flex-col justify-end pointer-events-none">
        <div className="max-w-[80%] mb-6">
            <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-white/10 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider rounded">
                    {dish.category}
                </span>
            </div>
            <h3 className="text-4xl font-bold text-white leading-none tracking-tight mb-3 drop-shadow-lg">{dish.name}</h3>
            <p className="text-zinc-200 text-sm leading-relaxed font-light drop-shadow-md line-clamp-3">
                {dish.description}
            </p>
        </div>

        {/* Single CTA Button */}
        <button 
            onClick={handleAdd}
            className={`pointer-events-auto w-full py-4 rounded-sm font-bold text-sm tracking-[0.2em] uppercase transition-all duration-300 shadow-xl flex items-center justify-center gap-3 ${
            added ? 'bg-green-500 text-black' : 'bg-white text-black hover:bg-zinc-200'
            }`}
        >
            {added ? <Check size={18} /> : <Plus size={18} />}
            {added ? "ADDED TO ORDER" : "ADD TO ORDER"}
        </button>
      </div>
    </div>
  );
};