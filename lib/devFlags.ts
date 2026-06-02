/** Local dev only — Vite sets import.meta.env.DEV; never true in production builds. */
const isViteDev = import.meta.env.DEV === true;

/** Skip owner LoginPage and open Menu Editor directly (UI routing only; API calls still need Supabase session for saves). */
export const devSkipOwnerLogin = (): boolean =>
    isViteDev && import.meta.env.VITE_DEV_SKIP_LOGIN === "true";

/** Auto-load customer menu at this slug when visiting `/` locally (e.g. fresh-and-fusion). */
export const devMenuSlug = (): string | null => {
    if (!isViteDev) return null;
    const slug = import.meta.env.VITE_DEV_MENU_SLUG?.trim().toLowerCase();
    return slug || null;
};
