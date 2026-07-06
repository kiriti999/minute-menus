/** Server-only logger (inlined for Vercel — do not import from browser code). */

export type LogLevel = "info" | "warn" | "error";

export interface Logger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
}

const formatLine = (
    scope: string,
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
): string => {
    const prefix = `[${scope}] ${level}:`;
    if (!meta || Object.keys(meta).length === 0) return `${prefix} ${message}`;
    return `${prefix} ${message} ${JSON.stringify(meta)}`;
};

export const createLogger = (scope: string): Logger => ({
    info(message, meta) {
        console.info(formatLine(scope, "info", message, meta));
    },
    warn(message, meta) {
        console.warn(formatLine(scope, "warn", message, meta));
    },
    error(message, meta) {
        console.error(formatLine(scope, "error", message, meta));
    },
});
