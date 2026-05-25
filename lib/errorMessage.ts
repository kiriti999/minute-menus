type ErrorLike = {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
};

const isErrorLike = (value: unknown): value is ErrorLike =>
    typeof value === "object" &&
    value !== null &&
    ("message" in value || "code" in value || "details" in value);

/** Supabase/PostgREST errors are plain objects — not instanceof Error. */
export const getErrorMessage = (err: unknown, fallback = "Unknown error"): string => {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === "string" && err.trim()) return err;
    if (isErrorLike(err)) {
        const parts = [err.message, err.details, err.hint].filter(Boolean);
        const base = parts.join(" — ") || fallback;
        return err.code ? `${base} (${err.code})` : base;
    }
    return fallback;
};

export const toError = (err: unknown, fallback = "Unknown error"): Error =>
    new Error(getErrorMessage(err, fallback));
