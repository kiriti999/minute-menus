import { GoogleGenAI } from "@google/genai";
import { DishPerformance, AnalyticsMetric } from "../types";

export const getAiInsights = async (
  dishPerformance: DishPerformance[],
  trafficHistory: AnalyticsMetric[]
): Promise<string> => {
  
  if (!process.env.API_KEY) {
    return "Demo Mode: API Key missing. Real insights would appear here based on your sales data.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Act as a restaurant data analyst for "Minute Menus". 
      Analyze the following JSON data representing dish performance and hourly traffic.
      
      Dish Performance: ${JSON.stringify(dishPerformance)}
      Traffic History: ${JSON.stringify(trafficHistory)}

      Provide a concise executive summary (max 3 bullet points) containing:
      1. Identify the "Star Dish" (High views, high conversion).
      2. Identify an "Opportunity" (High views, low conversion - maybe price is too high?).
      3. Suggest a specific A/B test for tomorrow's menu to decrease average order time.

      Keep the tone professional and action-oriented.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate AI insights at this time. Please check your connection.";
  }
};

export const generateMarketingCopy = async (dishName: string, ingredients: string): Promise<string> => {
    if (!process.env.API_KEY) return "Delicious and freshly prepared.";
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a punchy, 10-word marketing hook for a dish named ${dishName} containing ${ingredients}.`,
        });
        return response.text || "Fresh and tasty.";
    } catch (e) {
        return "Fresh and tasty.";
    }
}
