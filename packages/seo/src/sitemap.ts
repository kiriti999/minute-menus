import { escapeHtml } from "./text";
import type { SitemapEntry } from "./types";

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
