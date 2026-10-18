/**
 * Pure SEO builders: restaurant <head> tags, schema.org JSON-LD, crawlable menu HTML, sitemap XML.
 * Inlined in lib/server (not a workspace package): Vercel functions cannot load value imports
 * from TypeScript-source workspace packages, which crashes the whole function at load.
 */

// ── Inlined from @minute-menus/currency — keep in sync ──

const resolveDiscountPercent = (dishDiscountPercent: number | undefined, categoryDiscountPercent: number | undefined): number => {
    if (dishDiscountPercent !== undefined && dishDiscountPercent > 0) return Math.min(100, Math.max(0, dishDiscountPercent));
    if (categoryDiscountPercent !== undefined && categoryDiscountPercent > 0) return Math.min(100, Math.max(0, categoryDiscountPercent));
    return 0;
};

/** Final price after the dish discount, or the category discount when the dish has none. */
export const discountedPrice = (price: number, dishDiscountPercent: number | null, categoryDiscountPercent: number | null): number => {
    const pct = resolveDiscountPercent(dishDiscountPercent ?? undefined, categoryDiscountPercent ?? undefined);
    return pct <= 0 ? price : Math.round(price * (1 - pct / 100) * 100) / 100;
};

const formatPriceInCurrency = (price: number, currencyCode: string): string => {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: currencyCode === "JPY" || currencyCode === "KRW" ? 0 : 2,
        }).format(price);
    } catch {
        return `${price}`;
    }
};

// ── types ──

export interface SeoDish {
    name: string;
    description: string;
    /** Final price after any dish/category discount. */
    price: number;
    imageUrl: string;
    soldOut: boolean;
}

export interface SeoMenuSection {
    title: string;
    dishes: SeoDish[];
}

export interface SeoRestaurant {
    name: string;
    slug: string;
    currency: string;
    directionsUrl: string | null;
    /** Delivery-platform listings (Zomato, Swiggy, …) — emitted as schema.org `sameAs`. */
    platformUrls: string[];
    sections: SeoMenuSection[];
}

export interface SitemapEntry {
    url: string;
    lastModified?: string;
    images?: { url: string; title: string }[];
}

// ── text ──

const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

/** Escapes text for HTML element content and quoted attributes (also valid for XML). */
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

/** Collapses whitespace and cuts at a word boundary so snippets don't end mid-word. */
export const truncateText = (value: string, maxLength: number): string => {
    const text = value.replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    const cut = text.slice(0, maxLength - 1);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
};

/** Serializes JSON-LD so menu text can never close the surrounding <script> tag. */
export const toJsonLdScript = (data: unknown): string =>
    `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

/** Search engines and link previews need a fetchable URL — inline data: images are dropped. */
export const publicImageUrl = (url: string | null | undefined): string => (url && /^https?:\/\//i.test(url) ? url : "");

// ── html ──

const SEO_BLOCK = /<!-- seo:start[\s\S]*?<!-- seo:end -->/;
const EMPTY_ROOT = '<div id="root"></div>';

/**
 * Swaps index.html's default SEO block for page-specific tags and pre-fills #root.
 * Returns the template unchanged if its markers are missing, so a bad template never breaks the app.
 */
export const injectSeo = (template: string, headTags: string, bodyHtml = ""): string => {
    if (!SEO_BLOCK.test(template)) return template;
    const withHead = template.replace(SEO_BLOCK, () => headTags);
    return bodyHtml ? withHead.replace(EMPTY_ROOT, () => `<div id="root">${bodyHtml}</div>`) : withHead;
};

// ── sitemap ──

/** Google ignores image entries past this many per URL. */
const MAX_IMAGES_PER_URL = 1000;

const imageXml = (image: { url: string; title: string }): string =>
    `<image:image><image:loc>${escapeHtml(image.url)}</image:loc><image:title>${escapeHtml(image.title)}</image:title></image:image>`;

const entryXml = (entry: SitemapEntry): string => {
    const lastModified = entry.lastModified ? `<lastmod>${escapeHtml(entry.lastModified)}</lastmod>` : "";
    const images = (entry.images ?? []).slice(0, MAX_IMAGES_PER_URL).map(imageXml).join("");
    return `<url><loc>${escapeHtml(entry.url)}</loc>${lastModified}${images}</url>`;
};

export const buildSitemapXml = (entries: SitemapEntry[]): string =>
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.map(entryXml).join("\n")}\n</urlset>\n`;

// ── restaurant ──

export const SITE_NAME = "Minute Menus";

/** Name new owners get before they set their own — such pages are placeholders, not real restaurants. */
const PLACEHOLDER_RESTAURANT_NAME = "my restaurant";
/** Dish descriptions shorter than this are too thin to stand alone in search snippets. */
const MIN_DESCRIPTION_LENGTH = 15;

const allDishes = (restaurant: SeoRestaurant): SeoDish[] => restaurant.sections.flatMap((section) => section.dishes);

/** Only real, populated restaurants should be indexed; empty placeholder pages hurt site-wide quality. */
export const isIndexableListing = (restaurantName: string, activeDishCount: number): boolean =>
    restaurantName.trim().toLowerCase() !== PLACEHOLDER_RESTAURANT_NAME && activeDishCount > 0;

export const isIndexableRestaurant = (restaurant: SeoRestaurant): boolean =>
    isIndexableListing(restaurant.name, allDishes(restaurant).length);

export const restaurantPageTitle = (restaurant: SeoRestaurant): string =>
    `${restaurant.name} Menu & Prices – Order Online | ${SITE_NAME}`;

export const restaurantPageDescription = (restaurant: SeoRestaurant): string => {
    const dishes = allDishes(restaurant);
    const sections = restaurant.sections.map((section) => section.title).slice(0, 3).join(", ");
    const highlights = dishes.slice(0, 2).map((dish) => dish.name).join(", ");
    const more = dishes.length > 2 ? ` + ${dishes.length - 2} more dishes` : "";
    return truncateText(
        `${restaurant.name} menu with prices & photos: ${sections}. Try ${highlights}${more}. Order online.`,
        160,
    );
};

export const dishDescription = (dish: SeoDish, section: SeoMenuSection, restaurantName: string): string =>
    dish.description.trim().length >= MIN_DESCRIPTION_LENGTH
        ? dish.description.trim()
        : `${dish.name} from the ${section.title} menu at ${restaurantName}.`;

const firstImage = (restaurant: SeoRestaurant): string | undefined =>
    allDishes(restaurant).find((dish) => dish.imageUrl)?.imageUrl;

const priceRange = (restaurant: SeoRestaurant): string | undefined => {
    const prices = allDishes(restaurant).map((dish) => dish.price).filter((price) => price > 0);
    if (prices.length === 0) return undefined;
    const format = (price: number) => formatPriceInCurrency(price, restaurant.currency);
    return `${format(Math.min(...prices))} – ${format(Math.max(...prices))}`;
};

const menuItemJsonLd = (dish: SeoDish, section: SeoMenuSection, restaurant: SeoRestaurant) => ({
    "@type": "MenuItem",
    name: dish.name,
    description: dishDescription(dish, section, restaurant.name),
    ...(dish.imageUrl ? { image: dish.imageUrl } : {}),
    offers: {
        "@type": "Offer",
        price: dish.price.toFixed(2),
        priceCurrency: restaurant.currency,
        availability: dish.soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    },
});

/** schema.org Restaurant + full Menu tree — lets Google understand dishes, prices and photos. */
export const restaurantJsonLd = (restaurant: SeoRestaurant, pageUrl: string) => {
    const images = allDishes(restaurant).filter((dish) => dish.imageUrl).slice(0, 5).map((dish) => dish.imageUrl);
    const range = priceRange(restaurant);
    return {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "@id": `${pageUrl}#restaurant`,
        name: restaurant.name,
        url: pageUrl,
        description: restaurantPageDescription(restaurant),
        ...(images.length > 0 ? { image: images } : {}),
        ...(range ? { priceRange: range } : {}),
        ...(restaurant.directionsUrl ? { hasMap: restaurant.directionsUrl } : {}),
        ...(restaurant.platformUrls.length > 0 ? { sameAs: restaurant.platformUrls } : {}),
        hasMenu: {
            "@type": "Menu",
            name: `${restaurant.name} Menu`,
            url: pageUrl,
            hasMenuSection: restaurant.sections.map((section) => ({
                "@type": "MenuSection",
                name: section.title,
                hasMenuItem: section.dishes.map((dish) => menuItemJsonLd(dish, section, restaurant)),
            })),
        },
    };
};

const metaTag = (attr: "name" | "property", key: string, content: string): string =>
    `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;

/** Tags that replace the default <!-- seo:start --> … <!-- seo:end --> block in index.html. */
export const restaurantHeadTags = (restaurant: SeoRestaurant, pageUrl: string): string => {
    const title = restaurantPageTitle(restaurant);
    const description = restaurantPageDescription(restaurant);
    const image = firstImage(restaurant);
    const indexable = isIndexableRestaurant(restaurant);
    return [
        `<title>${escapeHtml(title)}</title>`,
        metaTag("name", "description", description),
        metaTag("name", "robots", indexable ? "index, follow, max-image-preview:large" : "noindex, follow"),
        `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`,
        metaTag("property", "og:type", "restaurant.restaurant"),
        metaTag("property", "og:site_name", SITE_NAME),
        metaTag("property", "og:title", title),
        metaTag("property", "og:description", description),
        metaTag("property", "og:url", pageUrl),
        ...(image ? [metaTag("property", "og:image", image), metaTag("property", "og:image:alt", `${restaurant.name} menu`)] : []),
        metaTag("name", "twitter:card", image ? "summary_large_image" : "summary"),
        metaTag("name", "twitter:title", title),
        metaTag("name", "twitter:description", description),
        ...(image ? [metaTag("name", "twitter:image", image)] : []),
        ...(indexable ? [toJsonLdScript(restaurantJsonLd(restaurant, pageUrl))] : []),
    ].join("\n    ");
};

const dishHtml = (dish: SeoDish, section: SeoMenuSection, restaurant: SeoRestaurant): string => {
    const image = dish.imageUrl
        ? `<img src="${escapeHtml(dish.imageUrl)}" alt="${escapeHtml(`${dish.name} at ${restaurant.name}`)}" loading="lazy" width="64" height="64" class="w-16 h-16 rounded-lg object-cover shrink-0" />`
        : "";
    const status = dish.soldOut ? ` <span class="text-xs text-red-400">Sold out</span>` : "";
    return `<li class="flex gap-3 py-3 border-b border-white/10">${image}<div class="min-w-0 flex-1"><h3 class="font-semibold">${escapeHtml(dish.name)}</h3><p class="text-sm text-zinc-400">${escapeHtml(dishDescription(dish, section, restaurant.name))}</p><p class="text-sm font-semibold mt-1">${escapeHtml(formatPriceInCurrency(dish.price, restaurant.currency))}${status}</p></div></li>`;
};

/**
 * Crawlable menu rendered into #root before the React app mounts. createRoot replaces it
 * with the reel viewer, so users and crawlers see the same dishes and prices.
 */
export const restaurantBodyHtml = (restaurant: SeoRestaurant): string => {
    const sections = restaurant.sections
        .map(
            (section) =>
                `<section class="mt-6"><h2 class="text-lg font-bold">${escapeHtml(section.title)}</h2><ul>${section.dishes.map((dish) => dishHtml(dish, section, restaurant)).join("")}</ul></section>`,
        )
        .join("");
    return `<main class="h-screen overflow-y-auto max-w-2xl mx-auto px-4 py-8"><h1 class="text-2xl font-bold">${escapeHtml(restaurant.name)} — Menu &amp; Prices</h1><p class="text-zinc-400 mt-1">${escapeHtml(restaurantPageDescription(restaurant))}</p>${sections}</main>`;
};

/** Head tags for app pages that must never be indexed (dashboard, login, unknown slugs). */
export const noIndexHeadTags = (): string =>
    [`<title>${SITE_NAME}</title>`, metaTag("name", "robots", "noindex, nofollow")].join("\n    ");
