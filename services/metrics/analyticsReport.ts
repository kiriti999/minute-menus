import type { AnalyticsReport } from "../../types";
import type { MetricsTimeWindow } from "./timeWindow";

export type ReportOrderRow = {
    items: unknown;
    total_amount: number | string;
};

export type ReportSessionRow = {
    dish_id: string;
    duration: number | string;
    completed: boolean;
};

export type ReportDishRow = {
    id: string;
    name: string;
};

export type ReportSubscriptionRow = {
    id: string;
    status: string;
    plan_id: string;
    created_at: string;
};

export type ReportSubOrderRow = {
    status: string;
};

export type ReportPlanRow = {
    id: string;
    name: string;
    price_monthly: number | string;
};

type ReportOrderItem = {
    dishId: string;
    name: string;
    price: number;
    quantity: number;
};

const toNumber = (value: number | string): number => Number(value);

const parseOrderItems = (items: unknown): ReportOrderItem[] =>
    Array.isArray(items) ? (items as ReportOrderItem[]) : [];

const buildRevenueSection = (orders: ReportOrderRow[]) => {
    const totalRevenue = orders.reduce(
        (sum, order) => sum + toNumber(order.total_amount),
        0,
    );
    const orderCount = orders.length;
    const dishRevenueMap = new Map<string, { name: string; revenue: number; units: number }>();

    orders.forEach((order) => {
        parseOrderItems(order.items).forEach((item) => {
            const current = dishRevenueMap.get(item.dishId) ?? {
                name: item.name,
                revenue: 0,
                units: 0,
            };
            current.revenue += item.price * item.quantity;
            current.units += item.quantity;
            dishRevenueMap.set(item.dishId, current);
        });
    });

    return {
        total: totalRevenue,
        avgOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
        orderCount,
        topDishRevenue: Array.from(dishRevenueMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5),
    };
};

const buildEngagementSection = (
    sessions: ReportSessionRow[],
    orders: ReportOrderRow[],
    dishes: ReportDishRow[],
) => {
    const totalViews = sessions.length;
    const engagedViews = sessions.filter(
        (session) => toNumber(session.duration) > 5,
    ).length;
    const engagementRate = totalViews > 0 ? (engagedViews / totalViews) * 100 : 0;
    const avgWatchDuration =
        totalViews > 0
            ? sessions.reduce((sum, session) => sum + toNumber(session.duration), 0) /
              totalViews
            : 0;
    const completionRate =
        totalViews > 0
            ? (sessions.filter((session) => session.completed).length / totalViews) * 100
            : 0;

    const dishViewMap = new Map<string, { views: number; completions: number }>();
    sessions.forEach((session) => {
        const current = dishViewMap.get(session.dish_id) ?? { views: 0, completions: 0 };
        current.views += 1;
        if (session.completed) current.completions += 1;
        dishViewMap.set(session.dish_id, current);
    });

    const dishOrderMap = new Map<string, number>();
    orders.forEach((order) => {
        parseOrderItems(order.items).forEach((item) => {
            dishOrderMap.set(
                item.dishId,
                (dishOrderMap.get(item.dishId) ?? 0) + item.quantity,
            );
        });
    });

    const dishPerf = Array.from(dishViewMap.entries()).map(([id, stats]) => ({
        name: dishes.find((dish) => dish.id === id)?.name ?? "Unknown",
        views: stats.views,
        conversionRate:
            stats.views > 0 ? ((dishOrderMap.get(id) ?? 0) / stats.views) * 100 : 0,
    }));

    return {
        totalViews,
        engagementRate,
        avgWatchDuration,
        completionRate,
        topDishes: [...dishPerf].sort((a, b) => b.views - a.views).slice(0, 3),
        lowConversionDishes: dishPerf
            .filter((dish) => dish.views >= 3)
            .sort((a, b) => a.conversionRate - b.conversionRate)
            .slice(0, 3),
    };
};

const buildSubscriptionSection = (
    subscriptions: ReportSubscriptionRow[],
    subOrders: ReportSubOrderRow[],
    plans: ReportPlanRow[],
) => {
    const active = subscriptions.filter((sub) => sub.status === "active").length;
    const paused = subscriptions.filter((sub) => sub.status === "paused").length;
    const cancelled = subscriptions.filter((sub) => sub.status === "cancelled").length;
    const deliveredOrders = subOrders.filter((order) => order.status === "delivered").length;
    const totalSubOrders = subOrders.length;

    return {
        active,
        paused,
        cancelled,
        totalOrders: totalSubOrders,
        deliveredOrders,
        deliveryRate: totalSubOrders > 0 ? (deliveredOrders / totalSubOrders) * 100 : 0,
        planBreakdown: plans.map((plan) => {
            const count = subscriptions.filter(
                (sub) => sub.plan_id === plan.id && sub.status === "active",
            ).length;
            return {
                planName: plan.name,
                count,
                monthlyRevenue: count * toNumber(plan.price_monthly),
            };
        }),
    };
};

export const buildAnalyticsReport = (input: {
    timeWindow: MetricsTimeWindow;
    generatedAt: string;
    currency: string;
    since: string;
    sessions: ReportSessionRow[];
    orders: ReportOrderRow[];
    dishes: ReportDishRow[];
    subscriptions: ReportSubscriptionRow[];
    subOrders: ReportSubOrderRow[];
    plans: ReportPlanRow[];
}): AnalyticsReport => ({
    period: input.timeWindow,
    generatedAt: input.generatedAt,
    currency: input.currency,
    revenue: buildRevenueSection(input.orders),
    engagement: buildEngagementSection(input.sessions, input.orders, input.dishes),
    subscriptions: buildSubscriptionSection(
        input.subscriptions,
        input.subOrders,
        input.plans,
    ),
    customers: {
        total: input.subscriptions.length,
        newThisPeriod: input.subscriptions.filter(
            (sub) => sub.created_at >= input.since,
        ).length,
    },
});
