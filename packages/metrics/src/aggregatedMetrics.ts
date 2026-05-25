import type { AggregatedMetrics, DishPerformance } from "@minute-menus/types";
import {
    type MetricsTimeWindow,
    TIME_WINDOW_MS,
    trafficBucketKey,
    trafficPointCount,
} from "./timeWindow";

export type WatchSessionMetricRow = {
    dish_id: string;
    duration: number | string;
    completed: boolean;
    created_at: string;
};

export type OrderMetricRow = {
    time_to_order: number | string;
};

export type DishNameRow = {
    id: string;
    name: string;
};

type DishViewStats = {
    views: number;
    watchTime: number;
    completions: number;
};

const toNumber = (value: number | string): number => Number(value);

const rate = (part: number, whole: number): number =>
    whole > 0 ? (part / whole) * 100 : 0;

const buildDishMap = (sessions: WatchSessionMetricRow[]): Map<string, DishViewStats> => {
    const dishMap = new Map<string, DishViewStats>();
    sessions.forEach((session) => {
        const current = dishMap.get(session.dish_id) ?? {
            views: 0,
            watchTime: 0,
            completions: 0,
        };
        current.views += 1;
        current.watchTime += toNumber(session.duration);
        if (session.completed) current.completions += 1;
        dishMap.set(session.dish_id, current);
    });
    return dishMap;
};

const sessionSummary = (sessions: WatchSessionMetricRow[]) => {
    const totalViews = sessions.length;
    const totalWatchTime = sessions.reduce(
        (acc, session) => acc + toNumber(session.duration),
        0,
    );
    const completedSessions = sessions.filter((session) => session.completed).length;
    const engagedViews = sessions.filter(
        (session) => toNumber(session.duration) > 5,
    ).length;

    return { totalViews, totalWatchTime, completedSessions, engagedViews };
};

export const buildDishPerformance = (
    sessions: WatchSessionMetricRow[],
    dishes: DishNameRow[],
): DishPerformance[] => {
    const dishMap = buildDishMap(sessions);
    return Array.from(dishMap.entries())
        .map(([id, stats]) => ({
            id,
            name: dishes.find((dish) => dish.id === id)?.name ?? "Unknown",
            views: stats.views,
            watchTime: stats.watchTime,
            conversions: stats.completions,
            conversionRate: rate(stats.completions, stats.views),
        }))
        .sort((a, b) => b.views - a.views);
};

export const buildHourlyTraffic = (
    sessions: WatchSessionMetricRow[],
    timeWindow: MetricsTimeWindow,
    now: Date,
): { hour: string; views: number }[] => {
    const points = trafficPointCount(timeWindow);
    const interval = TIME_WINDOW_MS[timeWindow] / points;
    const buckets = new Map<string, number>();

    for (let i = points - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * interval);
        const key = trafficBucketKey(date, timeWindow);
        if (!buckets.has(key)) buckets.set(key, 0);
    }

    sessions.forEach((session) => {
        const key = trafficBucketKey(new Date(session.created_at), timeWindow);
        if (!buckets.has(key)) return;
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });

    return Array.from(buckets.entries()).map(([hour, views]) => ({ hour, views }));
};

export const buildAggregatedMetrics = (
    sessions: WatchSessionMetricRow[],
    orders: OrderMetricRow[],
    dishes: DishNameRow[],
    timeWindow: MetricsTimeWindow,
    now: Date,
): AggregatedMetrics => {
    const { totalViews, totalWatchTime, completedSessions, engagedViews } =
        sessionSummary(sessions);
    const totalOrders = orders.length;
    const avgWatchDuration = totalViews > 0 ? totalWatchTime / totalViews : 0;
    const avgOrderTime =
        totalOrders > 0
            ? orders.reduce((acc, order) => acc + toNumber(order.time_to_order), 0) /
              totalOrders
            : 0;
    const estimatedSessions = Math.max(1, Math.floor(totalViews / 4));
    const dishPerformance = buildDishPerformance(sessions, dishes);

    return {
        totalViews,
        totalWatchTime,
        avgWatchDuration,
        completionRate: rate(completedSessions, totalViews),
        mostPopularDishId: dishPerformance[0]?.id ?? "",
        engagementRate: rate(engagedViews, totalViews),
        totalOrders,
        avgOrderTime,
        conversionRate: (totalOrders / estimatedSessions) * 100,
        hourlyTraffic: buildHourlyTraffic(sessions, timeWindow, now),
        conversionFunnel: [
            { stage: "Menu Views", count: totalViews, fill: "#fff" },
            { stage: "Engaged (>5s)", count: engagedViews, fill: "#aaa" },
            { stage: "Orders", count: totalOrders, fill: "#4ade80" },
        ],
        dishPerformance,
    };
};
