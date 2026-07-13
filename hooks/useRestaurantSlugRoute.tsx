import type React from "react";
import { useEffect, useState } from "react";
import { devMenuSlug } from "../lib/devFlags";
import { supabaseService } from "../services/supabaseService";

const RESERVED_PATHS = ["dashboard", "login", "owner", "admin", "api", "clock"];

export type SlugRestaurantContext = {
    slug: string | null;
    id: string | null;
    name: string | null;
    currency: string;
};

export type SlugRouteState = SlugRestaurantContext & {
    loading: boolean;
    error: string | null;
    clearError: () => void;
    resetRestaurantContext: () => void;
};

export const useRestaurantSlugRoute = (): SlugRouteState => {
    const [slug, setSlug] = useState<string | null>(null);
    const [id, setId] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [currency, setCurrency] = useState("USD");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let path = window.location.pathname;
        const localMenuSlug = devMenuSlug();
        if (localMenuSlug && (path === "/" || path === "")) {
            path = `/${localMenuSlug}`;
        }

        const slugMatch = path.match(/^\/([a-z0-9-]+)$/i);
        if (!slugMatch) return;

        const potentialSlug = slugMatch[1].toLowerCase();
        if (RESERVED_PATHS.includes(potentialSlug)) return;

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
