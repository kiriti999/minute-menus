import { ExternalLink, MapPin, Zap } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { supabaseService } from "../services/supabaseService";

interface QrLandingPageProps {
    slug: string;
}

interface RestaurantLinks {
    name: string;
    zomato_url: string | null;
    swiggy_url: string | null;
    directions_url: string | null;
    menu_url: string;
}

export const QrLandingPage: React.FC<QrLandingPageProps> = ({ slug }) => {
    const [links, setLinks] = useState<RestaurantLinks | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        supabaseService.getRestaurantBySlug(slug)
            .then((data) => {
                if (!data) {
                    setNotFound(true);
                    return;
                }
                const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
                setLinks({
                    name: data.name,
                    zomato_url: data.zomato_url,
                    swiggy_url: data.swiggy_url,
                    directions_url: data.directions_url,
                    menu_url: `${baseUrl}/${data.slug}`,
                });
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (notFound || !links) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
                <div>
                    <p className="text-zinc-400 text-lg mb-2">Restaurant not found</p>
                    <p className="text-zinc-600 text-sm">This QR code may be outdated.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
            {/* Header */}
            <div className="w-full max-w-sm mb-10 text-center">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                    <span className="text-black font-bold text-2xl">
                        {links.name[0]?.toUpperCase() ?? "R"}
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{links.name}</h1>
                <p className="text-zinc-500 text-sm mt-1">How would you like to order?</p>
            </div>

            {/* Action Buttons */}
            <div className="w-full max-w-sm space-y-3">
                {/* Order Direct — always shown */}
                <a
                    href={links.menu_url}
                    className="flex items-center gap-4 w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black rounded-2xl px-5 py-4 transition-colors duration-150 shadow-lg shadow-emerald-900/40"
                >
                    <div className="w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center shrink-0">
                        <Zap size={20} fill="currentColor" />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-base leading-tight">Order Direct</div>
                        <div className="text-xs text-black/70 font-medium">Best Price · No commissions</div>
                    </div>
                    <ExternalLink size={16} className="ml-auto opacity-60 shrink-0" />
                </a>

                {/* Order on Zomato — only shown if configured */}
                {links.zomato_url && (
                    <a
                        href={links.zomato_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 w-full bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-800 hover:border-zinc-600 text-white rounded-2xl px-5 py-4 transition-colors duration-150"
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#E23744]/15">
                            <span className="text-[#E23744] font-black text-lg leading-none">Z</span>
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-base leading-tight">Order on Zomato</div>
                            <div className="text-xs text-zinc-500">Open in Zomato app</div>
                        </div>
                        <ExternalLink size={16} className="ml-auto opacity-40 shrink-0" />
                    </a>
                )}

                {/* Order on Swiggy — only shown if configured */}
                {links.swiggy_url && (
                    <a
                        href={links.swiggy_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 w-full bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-800 hover:border-zinc-600 text-white rounded-2xl px-5 py-4 transition-colors duration-150"
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#FC8019]/15">
                            <span className="text-[#FC8019] font-black text-lg leading-none">S</span>
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-base leading-tight">Order on Swiggy</div>
                            <div className="text-xs text-zinc-500">Open in Swiggy app</div>
                        </div>
                        <ExternalLink size={16} className="ml-auto opacity-40 shrink-0" />
                    </a>
                )}

                {/* Get Directions — only shown if configured */}
                {links.directions_url && (
                    <a
                        href={links.directions_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 w-full bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-800 hover:border-zinc-600 text-white rounded-2xl px-5 py-4 transition-colors duration-150"
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/15">
                            <MapPin size={18} className="text-blue-400" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-base leading-tight">Get Directions to Walk-In</div>
                            <div className="text-xs text-zinc-500">Open in Google Maps</div>
                        </div>
                        <ExternalLink size={16} className="ml-auto opacity-40 shrink-0" />
                    </a>
                )}
            </div>

            {/* Footer */}
            <p className="mt-12 text-[10px] font-mono text-zinc-700 uppercase tracking-[0.2em]">
                Powered by Minute Menus
            </p>
        </div>
    );
};
