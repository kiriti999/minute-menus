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
	items?: unknown;
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

type OrderLineItem = {
	dishId: string;
	name?: string;
	price: number;
	quantity: number;
};

const toNumber = (value: number | string): number => Number(value);

const rate = (part: number, whole: number): number =>
	whole > 0 ? (part / whole) * 100 : 0;

const parseOrderItems = (items: unknown): OrderLineItem[] =>
	Array.isArray(items) ? (items as OrderLineItem[]) : [];

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

const buildSalesMap = (
	orders: OrderMetricRow[],
): Map<string, { unitsSold: number; revenue: number; name?: string }> => {
	const salesMap = new Map<string, { unitsSold: number; revenue: number; name?: string }>();
	orders.forEach((order) => {
		parseOrderItems(order.items).forEach((item) => {
			if (!item.dishId) return;
			const qty = toNumber(item.quantity) || 0;
			const price = toNumber(item.price) || 0;
			const current = salesMap.get(item.dishId) ?? { unitsSold: 0, revenue: 0 };
			current.unitsSold += qty;
			current.revenue += price * qty;
			if (item.name) current.name = item.name;
			salesMap.set(item.dishId, current);
		});
	});
	return salesMap;
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

const compareBySales = (a: DishPerformance, b: DishPerformance): number => {
	if (b.unitsSold !== a.unitsSold) return b.unitsSold - a.unitsSold;
	if (b.revenue !== a.revenue) return b.revenue - a.revenue;
	return b.views - a.views;
};

export const buildDishPerformance = (
	sessions: WatchSessionMetricRow[],
	orders: OrderMetricRow[],
	dishes: DishNameRow[],
): DishPerformance[] => {
	const viewMap = buildDishMap(sessions);
	const salesMap = buildSalesMap(orders);
	const dishIds = new Set([...viewMap.keys(), ...salesMap.keys()]);

	return Array.from(dishIds)
		.map((id) => {
			const views = viewMap.get(id);
			const sales = salesMap.get(id);
			const unitsSold = sales?.unitsSold ?? 0;
			const viewCount = views?.views ?? 0;
			return {
				id,
				name:
					dishes.find((dish) => dish.id === id)?.name ??
					sales?.name ??
					"Unknown",
				views: viewCount,
				watchTime: views?.watchTime ?? 0,
				unitsSold,
				revenue: Math.round((sales?.revenue ?? 0) * 100) / 100,
				conversions: unitsSold,
				conversionRate: rate(unitsSold, viewCount),
			};
		})
		.sort(compareBySales);
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
	const dishPerformance = buildDishPerformance(sessions, orders, dishes);
	const mostViewed = [...dishPerformance].sort((a, b) => b.views - a.views)[0];

	return {
		totalViews,
		totalWatchTime,
		avgWatchDuration,
		completionRate: rate(completedSessions, totalViews),
		mostPopularDishId: dishPerformance[0]?.id ?? "",
		mostViewedDishId: mostViewed?.id ?? "",
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
