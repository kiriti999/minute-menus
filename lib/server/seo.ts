/**
 * Server-rendered SEO for public restaurant pages and the sitemap.
 *
 * vercel.json rewrites `/:slug`, `/:slug/menu` and `/sitemap.xml` to /api/keepalive?action=…
 * (Hobby plan is at 12/12 functions). Pages are the normal SPA shell with restaurant-specific
 * <head> tags, schema.org JSON-LD and a crawlable menu pre-filled into #root.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getEffectivePrice, resolveDiscountPercent } from "@minute-menus/currency";
import {
    buildSitemapXml,
    injectSeo,
    isIndexableListing,
    isIndexableRestaurant,
    noIndexHeadTags,
    publicImageUrl,
    restaurantBodyHtml,
    restaurantHeadTags,
    type SeoDish,
    type SeoMenuSection,
    type SeoRestaurant,
    type SitemapEntry,
} from "@minute-menus/seo";
import { getSupabaseAdmin } from "../supabase-admin";
import { createLogger } from "./logger";

const log = createLogger("seo");

const SITE_URL = (process.env.VITE_SITE_URL ?? "https://minutemenus.com").replace(/\/+$/, "");
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;
/** Keep in sync with RESERVED_PATHS in hooks/useRestaurantSlugRoute.tsx. */
const RESERVED_PATHS = new Set(["dashboard", "login", "owner", "admin", "api", "clock", "recipe-book", "menu"]);
/** CDN serves cached pages instantly; menu edits show up in search snapshots within minutes. */
const PAGE_CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=86400";
const SITEMAP_CACHE = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";
const PAGE_SIZE = 1000;

type RestaurantRow = {
    id: string;
    name: string;
    slug: string;
    currency: string | null;
    directions_url: string | null;
    zomato_url: string | null;
    swiggy_url: string | null;
    magicpin_url: string | null;
};
type CategoryRow = { id: string; title: string; discount_percent: number | null };
type DishRow = {
    category_id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    manual_sold_out: boolean;
    discount_percent: number | null;
};

const firstQueryValue = (value: string | string[] | undefined): string =>
    (Array.isArray(value) ? value[0] : value) ?? "";

const toSeoDish = (dish: DishRow, categoryDiscount: number | null): SeoDish => ({
    name: dish.name,
    description: dish.description ?? "",
    price: getEffectivePrice(
        Number(dish.price),
        resolveDiscountPercent(dish.discount_percent ?? undefined, categoryDiscount ?? undefined),
    ).final,
    imageUrl: publicImageUrl(dish.image_url),
    soldOut: dish.manual_sold_out,
});

const toSections = (categories: CategoryRow[], dishes: DishRow[]): SeoMenuSection[] =>
    categories
        .map((category) => ({
            title: category.title,
            dishes: dishes
                .filter((dish) => dish.category_id === category.id)
                .map((dish) => toSeoDish(dish, category.discount_percent)),
        }))
        .filter((section) => section.dishes.length > 0);

const toSeoRestaurant = (row: RestaurantRow, sections: SeoMenuSection[]): SeoRestaurant => ({
    name: row.name,
    slug: row.slug,
    currency: (row.currency || "INR").toUpperCase(),
    directionsUrl: row.directions_url,
    platformUrls: [row.zomato_url, row.swiggy_url, row.magicpin_url].filter((url): url is string => Boolean(url)),
    sections,
});

/** Same data customers see: active dishes only, in menu order. */
const loadSeoRestaurant = async (admin: SupabaseClient, slug: string): Promise<SeoRestaurant | null> => {
    const { data: row, error } = await admin
        .from("restaurants")
        .select("id, name, slug, currency, directions_url, zomato_url, swiggy_url, magicpin_url")
        .eq("slug", slug)
        .maybeSingle<RestaurantRow>();
    if (error) throw new Error(`Restaurant lookup failed: ${error.message}`);
    if (!row) return null;

    const [categories, dishes] = await Promise.all([
        admin.from("categories").select("id, title, discount_percent").eq("restaurant_id", row.id).order("sort_order"),
        admin
            .from("dishes")
            .select("category_id, name, description, price, image_url, manual_sold_out, discount_percent")
            .eq("restaurant_id", row.id)
            .eq("is_active", true)
            .order("sort_order"),
    ]);
    const loadError = categories.error ?? dishes.error;
    if (loadError) throw new Error(`Menu lookup failed: ${loadError.message}`);
    return toSeoRestaurant(row, toSections((categories.data ?? []) as CategoryRow[], (dishes.data ?? []) as DishRow[]));
};

type RenderedPage = { status: number; html: string };

const renderRestaurantPage = async (template: string, slug: string): Promise<RenderedPage> => {
    if (RESERVED_PATHS.has(slug)) return { status: 200, html: injectSeo(template, noIndexHeadTags()) };
    const admin = getSupabaseAdmin();
    if (!admin) throw new Error("missing Supabase env");
    const restaurant = SLUG_PATTERN.test(slug) ? await loadSeoRestaurant(admin, slug) : null;
    // Real 404 status (the SPA still renders its own "not found" screen) avoids soft-404s in Search Console.
    if (!restaurant) return { status: 404, html: injectSeo(template, noIndexHeadTags()) };
    const pageUrl = `${SITE_URL}/${restaurant.slug}`;
    const body = isIndexableRestaurant(restaurant) ? restaurantBodyHtml(restaurant) : "";
    return { status: 200, html: injectSeo(template, restaurantHeadTags(restaurant, pageUrl), body) };
};

let cachedTemplate: string | null = null;

/** The built index.html (hashed asset URLs) is fetched from this deployment's own static output. */
const loadTemplate = async (req: VercelRequest): Promise<string> => {
    if (cachedTemplate) return cachedTemplate;
    const host = firstQueryValue(req.headers["x-forwarded-host"]) || req.headers.host || "";
    if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) throw new Error("invalid host header");
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const response = await fetch(`${protocol}://${host}/index.html`);
    if (!response.ok) throw new Error(`index.html fetch failed: ${response.status}`);
    cachedTemplate = await response.text();
    return cachedTemplate;
};

const sendHtml = (res: VercelResponse, status: number, html: string, cacheControl: string) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", cacheControl);
    return res.status(status).send(html);
};

/** GET /:slug and /:slug/menu → SPA shell with restaurant SEO. Degrades to the plain shell on errors. */
export const handleSeoPage = async (req: VercelRequest, res: VercelResponse) => {
    const slug = firstQueryValue(req.query.slug).toLowerCase();
    let template: string;
    try {
        template = await loadTemplate(req);
    } catch (error) {
        log.error("template load failed", { message: error instanceof Error ? error.message : String(error) });
        return sendHtml(res, 503, "<!doctype html><title>Minute Menus</title><p>Please refresh the page.</p>", "no-store");
    }
    try {
        const page = await renderRestaurantPage(template, slug);
        return sendHtml(res, page.status, page.html, PAGE_CACHE);
    } catch (error) {
        log.error("seo render failed", { slug, message: error instanceof Error ? error.message : String(error) });
        return sendHtml(res, 200, template, "no-store");
    }
};

type DishImageRow = { restaurant_id: string; name: string; image_url: string | null };

const loadActiveDishes = async (admin: SupabaseClient): Promise<DishImageRow[]> => {
    const rows: DishImageRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await admin
            .from("dishes")
            .select("restaurant_id, name, image_url")
            .eq("is_active", true)
            .order("id")
            .range(from, from + PAGE_SIZE - 1);
        if (error) throw new Error(`Dish lookup failed: ${error.message}`);
        rows.push(...((data ?? []) as DishImageRow[]));
        if (!data || data.length < PAGE_SIZE) return rows;
    }
};

type SitemapRestaurantRow = Pick<RestaurantRow, "id" | "name" | "slug">;

const restaurantSitemapEntry = (row: SitemapRestaurantRow, dishes: DishImageRow[]): SitemapEntry => ({
    url: `${SITE_URL}/${row.slug}`,
    images: dishes
        .filter((dish) => publicImageUrl(dish.image_url))
        .map((dish) => ({ url: publicImageUrl(dish.image_url), title: `${dish.name} – ${row.name}` })),
});

const loadSitemapEntries = async (admin: SupabaseClient): Promise<SitemapEntry[]> => {
    const dishes = await loadActiveDishes(admin);
    const restaurantIds = [...new Set(dishes.map((dish) => dish.restaurant_id))];
    if (restaurantIds.length === 0) return [];
    const { data, error } = await admin.from("restaurants").select("id, name, slug").in("id", restaurantIds);
    if (error) throw new Error(`Restaurant lookup failed: ${error.message}`);
    return ((data ?? []) as SitemapRestaurantRow[])
        .map((row) => ({ row, own: dishes.filter((dish) => dish.restaurant_id === row.id) }))
        .filter(({ row, own }) => isIndexableListing(row.name, own.length))
        .map(({ row, own }) => restaurantSitemapEntry(row, own));
};

/** GET /sitemap.xml → home page + every real, populated restaurant with its dish photos. */
export const handleSitemap = async (_req: VercelRequest, res: VercelResponse) => {
    const admin = getSupabaseAdmin();
    let restaurants: SitemapEntry[] = [];
    try {
        if (!admin) throw new Error("missing Supabase env");
        restaurants = await loadSitemapEntries(admin);
    } catch (error) {
        log.error("sitemap failed", { message: error instanceof Error ? error.message : String(error) });
        res.setHeader("Cache-Control", "no-store");
        return res.status(503).send("Sitemap temporarily unavailable");
    }
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", SITEMAP_CACHE);
    return res.status(200).send(buildSitemapXml([{ url: `${SITE_URL}/` }, ...restaurants]));
};
