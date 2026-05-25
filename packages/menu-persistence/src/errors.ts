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

export const toError = (err: unknown, fallback = "Unknown error"): Error => {
    if (err instanceof Error && err.message) return err;
    if (typeof err === "string" && err.trim()) return new Error(err);
    if (isErrorLike(err)) {
        const parts = [err.message, err.details, err.hint].filter(Boolean);
        const base = parts.join(" — ") || fallback;
        return new Error(err.code ? `${base} (${err.code})` : base);
    }
    return new Error(fallback);
};

export const throwStepError = (step: string, err: unknown): never => {
    throw toError(err, `${step} failed`);
};
