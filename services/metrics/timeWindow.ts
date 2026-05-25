export type MetricsTimeWindow = "24h" | "7d" | "30d";

export const TIME_WINDOW_MS: Record<MetricsTimeWindow, number> = {
    "24h": 86400000,
    "7d": 604800000,
    "30d": 2592000000,
};

export const sinceIso = (timeWindow: MetricsTimeWindow, now = new Date()): string =>
    new Date(now.getTime() - TIME_WINDOW_MS[timeWindow]).toISOString();

export const trafficBucketKey = (
    date: Date,
    timeWindow: MetricsTimeWindow,
): string =>
    timeWindow === "24h"
        ? `${date.getHours()}:00`
        : `${date.getMonth() + 1}/${date.getDate()}`;

export const trafficPointCount = (timeWindow: MetricsTimeWindow): number =>
    timeWindow === "24h" ? 24 : timeWindow === "7d" ? 7 : 30;
