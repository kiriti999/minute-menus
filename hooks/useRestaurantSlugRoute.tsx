import type React from "react";
import { useEffect, useState } from "react";
import { devMenuSlug } from "../lib/devFlags";
import { supabaseService } from "../services/supabaseService";
import type { WeeklyOperatingHours } from "@minute-menus/types";

const RESERVED_PATHS = ["dashboard", "login", "owner", "admin", "api", "clock", "recipe-book", "menu"];

export type SlugRestaurantContext = {
    slug: string | null;
    id: string | null;
    name: string | null;
    currency: string;
    timezone: string;
    deliveryEnabled: boolean;
    operatingHours: WeeklyOperatingHours;
};

export type SlugRouteState = SlugRestaurantContext & {
    loading: boolean;
    error: string | null;
    clearError: () => void;
    resetRestaurantContext: () => void;
};

/** Restaurant slug in the current URL, or null when the path isn't a slug route. */
function currentSlugCandidate(): string | null {
    let path = window.location.pathname;
    const localMenuSlug = devMenuSlug();
    if (localMenuSlug && (path === "/" || path === "")) {
        path = `/${localMenuSlug}`;
    }

    const slugMatch = path.match(/^\/([a-z0-9-]+)$/i);
    if (!slugMatch) return null;

    const potentialSlug = slugMatch[1].toLowerCase();
    return RESERVED_PATHS.includes(potentialSlug) ? null : potentialSlug;
}

export const useRestaurantSlugRoute = (): SlugRouteState => {
    const [slug, setSlug] = useState<string | null>(null);
    const [id, setId] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [currency, setCurrency] = useState("USD");
    const [timezone, setTimezone] = useState("Asia/Kolkata");
    const [deliveryEnabled, setDeliveryEnabled] = useState(true);
    const [operatingHours, setOperatingHours] = useState<WeeklyOperatingHours>({});
    // Already loading on the first render of a slug URL, so the landing page never flashes before the lookup starts.
    const [loading, setLoading] = useState(() => currentSlugCandidate() !== null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const potentialSlug = currentSlugCandidate();
        if (!potentialSlug) return;

        setLoading(true);
        supabaseService
            .getRestaurantBySlug(potentialSlug)
            .then((restaurant) => {
                if (!restaurant) {
                    setError(`Restaurant "${potentialSlug}" not found`);
                    return;
                }
                setSlug(restaurant.slug);
                setId(restaurant.id);
                setName(restaurant.name);
                setCurrency(restaurant.currency);
                setTimezone(restaurant.timezone);
                setDeliveryEnabled(restaurant.delivery_enabled);
                setOperatingHours(restaurant.operating_hours);
            })
            .catch((err) => {
                console.error("Slug lookup error:", err);
                setError("Failed to load restaurant");
            })
            .finally(() => setLoading(false));
    }, []);

    return {
        slug,
        id,
        name,
        currency,
        timezone,
        deliveryEnabled,
        operatingHours,
        loading,
        error,
        clearError: () => setError(null),
        resetRestaurantContext: () => {
            setSlug(null);
            setId(null);
            setName(null);
            setCurrency("USD");
            setError(null);
        },
    };
};
