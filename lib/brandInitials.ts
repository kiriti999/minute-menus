const CONNECTORS = new Set(["and", "&", "n"]);
const MAX_INITIALS = 3;

/** Logo-badge text for a restaurant: "Fresh and Fusion" → "F&F", "Green Bowl" → "GB", "Cafe" → "C". */
export const brandInitials = (name: string | null | undefined): string => {
    const words = (name ?? "").split(/[\s-]+/).filter(Boolean);
    if (words.length === 0) return "M";
    let result = "";
    for (const word of words) {
        const lower = word.toLowerCase();
        if (CONNECTORS.has(lower)) {
            if (result && !result.endsWith("&")) result += "&";
        } else {
            result += word[0].toUpperCase();
        }
    }
    return result.replace(/&+$/, "").slice(0, MAX_INITIALS) || "M";
};
