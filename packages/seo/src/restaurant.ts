import { formatPriceInCurrency } from "@minute-menus/currency";
import { escapeHtml, toJsonLdScript, truncateText } from "./text";
import type { SeoDish, SeoMenuSection, SeoRestaurant } from "./types";

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
