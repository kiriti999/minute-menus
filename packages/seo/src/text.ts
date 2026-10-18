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
