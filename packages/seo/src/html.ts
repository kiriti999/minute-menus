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
