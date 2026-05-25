import Anthropic from "@anthropic-ai/sdk";
import { createLogger } from "@minute-menus/logger";
import type { AnalyticsReport } from "@minute-menus/types";

const log = createLogger("ai");

const getClient = (): Anthropic =>
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  });

// ─── Fallback report (no API key / network error) ────────────────────────────
const buildFallbackReport = (r: AnalyticsReport): string => {
  const fmt = (n: number) => `${r.currency} ${n.toFixed(2)}`;
  const lines = [
    `## Executive Summary`,
    `Period: last ${r.period} · Generated: ${new Date(r.generatedAt).toLocaleString()}.`,
    `${r.revenue.orderCount} order${r.revenue.orderCount !== 1 ? "s" : ""} · ${r.subscriptions.active} active subscriber${r.subscriptions.active !== 1 ? "s" : ""} · ${r.engagement.totalViews} menu view${r.engagement.totalViews !== 1 ? "s" : ""}.`,
    ``,
    `## Revenue & Orders`,
    `Total: ${fmt(r.revenue.total)} · Avg order value: ${fmt(r.revenue.avgOrderValue)}.`,
    r.revenue.topDishRevenue.length
      ? `Top earner: ${r.revenue.topDishRevenue[0].name} (${fmt(r.revenue.topDishRevenue[0].revenue)} · ${r.revenue.topDishRevenue[0].units} units).`
      : `No orders recorded in this period yet.`,
    ``,
    `## Menu Performance`,
    `Views: ${r.engagement.totalViews} · Engagement rate (>5s): ${r.engagement.engagementRate.toFixed(1)}% · Avg watch: ${r.engagement.avgWatchDuration.toFixed(1)}s · Reel completion: ${r.engagement.completionRate.toFixed(1)}%.`,
    r.engagement.topDishes.length
      ? `Most viewed: ${r.engagement.topDishes.map((d) => `${d.name} (${d.views}v, ${d.conversionRate.toFixed(1)}% conv)`).join(" · ")}.`
      : `No watch sessions recorded yet.`,
    r.engagement.lowConversionDishes.length
      ? `Low conversion (opportunity): ${r.engagement.lowConversionDishes[0].name} — ${r.engagement.lowConversionDishes[0].views} views but only ${r.engagement.lowConversionDishes[0].conversionRate.toFixed(1)}% order rate.`
      : ``,
    ``,
    `## Subscription Health`,
    `Active: ${r.subscriptions.active} · Paused: ${r.subscriptions.paused} · Cancelled: ${r.subscriptions.cancelled}.`,
    `Delivery rate: ${r.subscriptions.deliveryRate.toFixed(1)}% (${r.subscriptions.deliveredOrders}/${r.subscriptions.totalOrders} orders delivered).`,
    r.subscriptions.planBreakdown.length
      ? `Plans: ${r.subscriptions.planBreakdown.map((p) => `${p.planName} ${p.count} subs`).join(" · ")}.`
      : ``,
    ``,
    `## Recommendations`,
    `• Set ANTHROPIC_API_KEY in .env to unlock AI-generated recommendations.`,
    r.engagement.lowConversionDishes.length
      ? `• Review pricing/description for "${r.engagement.lowConversionDishes[0].name}" — high views, low orders.`
      : `• Add more dishes and track customer reels to surface optimisation opportunities.`,
    r.subscriptions.paused > 0
      ? `• Reach out to ${r.subscriptions.paused} paused subscriber${r.subscriptions.paused !== 1 ? "s" : ""} — a targeted offer could win them back.`
      : `• Continue current subscription performance.`,
  ];
  return lines.filter((l) => l !== undefined).join("\n");
};

// ─── Main AI analytics report ────────────────────────────────────────────────
//
// IMPORTANT: This function uses only internal Supabase data (orders, watch_sessions,
// customer_subscriptions, subscription_daily_orders). No Google Analytics 4 or
// any external data source is required. GA4 gives generic web metrics; this
// function uses restaurant-specific KPIs that are far more actionable.
// Customer input data does NOT need to change — phone + order history is enough.

export const generateAnalyticsReport = async (
  report: AnalyticsReport,
  restaurantName = "the restaurant",
): Promise<string> => {
  if (!process.env.ANTHROPIC_API_KEY) return buildFallbackReport(report);

  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are the analytics engine for Minute Menus, a restaurant digital menu platform.
Analyze this ${report.period} snapshot for "${restaurantName}" and write a structured performance report.

DATA:
${JSON.stringify(report, null, 2)}

Use EXACTLY these four section headings (## prefix), each 3-4 sentences max. Use the actual numbers. Be direct and action-oriented with no filler.

## Executive Summary
Overall health in 2-3 sentences. Call out the single most important number.

## Revenue & Orders
Revenue totals, average order value, best-earning dish. Highlight any revenue concentration risk if one dish dominates.

## Menu Performance
Top reel, engagement rate, avg watch time. Identify the best-converting dish AND the highest-opportunity dish (high views, low conversion) with a specific hypothesis for why.

## Subscription Health
Active vs paused vs cancelled. Delivery success rate. Plan revenue. Flag any churn signal.

## Recommendations
Exactly 3 numbered actions the owner should take THIS WEEK. Each must reference a specific metric from the data.`,
        },
      ],
    });

    const block = response.content[0];
    return block.type === "text" ? block.text : buildFallbackReport(report);
  } catch (error) {
    log.error("Anthropic API error", { message: String(error) });
    return buildFallbackReport(report);
  }
};

export const generateMarketingCopy = async (
  dishName: string,
  ingredients: string,
): Promise<string> => {
  if (!process.env.ANTHROPIC_API_KEY) return "Delicious and freshly prepared.";

  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 64,
      messages: [
        {
          role: "user",
          content: `Write a punchy, 10-word marketing hook for a dish named "${dishName}" containing ${ingredients}. Return only the hook, no punctuation.`,
        },
      ],
    });

    const block = response.content[0];
    return block.type === "text" ? block.text.trim() : "Fresh and tasty.";
  } catch {
    return "Fresh and tasty.";
  }
};
