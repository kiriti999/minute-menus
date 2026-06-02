/** Turn slug-style names (fresh-and-fusion) into readable labels (Fresh And Fusion). */
export const formatDisplayName = (name: string): string =>
    name
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
