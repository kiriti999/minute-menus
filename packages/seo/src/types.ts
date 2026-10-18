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
