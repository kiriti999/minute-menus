import Anthropic from "@anthropic-ai/sdk";
import type { AnalyticsMetric, DishPerformance } from "../types";

const getClient = (): Anthropic =>
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  });

export const getAiInsights = async (
  dishPerformance: DishPerformance[],
  trafficHistory: AnalyticsMetric[],
): Promise<string> => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return "Demo Mode: API Key missing. Real insights would appear here based on your sales data.";
  }

  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Act as a restaurant data analyst for "Minute Menus".
Analyze the following data and provide a concise executive summary (max 3 bullet points):

1. Identify the "Star Dish" (high views, high conversion).
2. Identify an "Opportunity" (high views, low conversion — price too high?).
3. Suggest a specific A/B test for tomorrow to decrease average order time.

Dish Performance: ${JSON.stringify(dishPerformance)}
Traffic History: ${JSON.stringify(trafficHistory)}

Keep the tone professional and action-oriented.`,
        },
      ],
    });

    const block = response.content[0];
    return block.type === "text" ? block.text : "No insights generated.";
  } catch (error) {
    console.error("Anthropic API Error:", error);
    return "Unable to generate AI insights at this time. Please check your connection.";
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
