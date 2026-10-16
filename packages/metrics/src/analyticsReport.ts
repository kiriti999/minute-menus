import type { AnalyticsReport } from "@minute-menus/types";
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
    payment_id: string | null;
    subtotal_amount: number | string | null;
    gst_amount: number | string | null;
};

export type ReportSubOrderRow = {
    status: string;
    delivery_date: string;
    dish_name: string;
};

export type ReportPlanRow = {
    id: string;
    name: string;
};

/** Refund requests the owner marked as paid out. */
export type ReportRefundRow = {
    amount: number | string;
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

// Meal plans are prepaid: count each online payment in the period it was
// received (matches Razorpay payouts), not spread across delivered meals.
const subscriptionPaid = (sub: ReportSubscriptionRow): number =>
    toNumber(sub.subtotal_amount ?? 0) + toNumber(sub.gst_amount ?? 0);

const paidInPeriod = (subscriptions: ReportSubscriptionRow[], since: string) =>
    subscriptions.filter((sub) => sub.payment_id && sub.created_at >= since);

const sumPaid = (subscriptions: ReportSubscriptionRow[]): number =>
    subscriptions.reduce((sum, sub) => sum + subscriptionPaid(sub), 0);

const buildMealPlanRevenue = (
    subscriptions: ReportSubscriptionRow[],
    refunds: ReportRefundRow[],
    since: string,
) => {
    const payments = paidInPeriod(subscriptions, since);
    const gross = sumPaid(payments);
    const refunded = refunds.reduce((sum, refund) => sum + toNumber(refund.amount), 0);
    return { payments: payments.length, gross, refunded, net: gross - refunded };
};

const buildRevenueSection = (
    orders: ReportOrderRow[],
    mealPlan: ReturnType<typeof buildMealPlanRevenue>,
) => {
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
        total: totalRevenue + mealPlan.net,
        orderRevenue: totalRevenue,
        mealPlanRevenue: mealPlan.net,
        mealPlanPayments: mealPlan.payments,
        mealPlanRefunds: mealPlan.refunded,
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

const buildTopDeliveredDishes = (subOrders: ReportSubOrderRow[], sinceDate: string) => {
    const counts = new Map<string, number>();
    subOrders
        .filter((order) => order.status === "delivered" && order.delivery_date >= sinceDate)
        .forEach((order) => counts.set(order.dish_name, (counts.get(order.dish_name) ?? 0) + 1));
    return Array.from(counts, ([name, delivered]) => ({ name, delivered }))
        .sort((a, b) => b.delivered - a.delivered)
        .slice(0, 5);
};

const buildSubscriptionSection = (
    subscriptions: ReportSubscriptionRow[],
    subOrders: ReportSubOrderRow[],
    plans: ReportPlanRow[],
    since: string,
) => {
    const periodPayments = paidInPeriod(subscriptions, since);
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
                periodRevenue: sumPaid(periodPayments.filter((sub) => sub.plan_id === plan.id)),
            };
        }),
        topDeliveredDishes: buildTopDeliveredDishes(subOrders, since.slice(0, 10)),
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
    refunds: ReportRefundRow[];
}): AnalyticsReport => ({
    period: input.timeWindow,
    generatedAt: input.generatedAt,
    currency: input.currency,
    revenue: buildRevenueSection(
        input.orders,
        buildMealPlanRevenue(input.subscriptions, input.refunds, input.since),
    ),
    engagement: buildEngagementSection(input.sessions, input.orders, input.dishes),
    subscriptions: buildSubscriptionSection(
        input.subscriptions,
        input.subOrders,
        input.plans,
        input.since,
    ),
    customers: {
        total: input.subscriptions.length,
        newThisPeriod: input.subscriptions.filter(
            (sub) => sub.created_at >= input.since,
        ).length,
    },
});
