import { createLogger } from "@minute-menus/logger";
import { enhanceWithReplicate } from "./enhanceReplicate";
import { enhanceWithGemini, type EnhanceFoodPhotoInput } from "./enhanceGemini";

const log = createLogger("image-enhance");

export type { EnhanceFoodPhotoInput } from "./enhanceGemini";
export { parseDataUrl } from "./enhanceGemini";

export type EnhanceFoodPhotoResult = {
  imageDataUrl: string;
  summary?: string;
  provider: "replicate" | "gemini";
};

export const enhanceFoodPhoto = async (
  input: EnhanceFoodPhotoInput,
): Promise<EnhanceFoodPhotoResult> => {
  const preferReplicate = process.env.IMAGE_ENHANCE_PRIMARY !== "gemini";
  const hasReplicate = Boolean(process.env.REPLICATE_API_TOKEN);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  const tryReplicate = async (): Promise<EnhanceFoodPhotoResult> => {
    const result = await enhanceWithReplicate({
      imageDataUrl: `data:${input.mimeType};base64,${input.imageBase64}`,
      styleId: input.styleId,
    });
    return { ...result, provider: "replicate" };
  };

  const tryGemini = async (): Promise<EnhanceFoodPhotoResult> => {
    const result = await enhanceWithGemini(input);
    return { ...result, provider: "gemini" };
  };

  if (preferReplicate && hasReplicate) {
    try {
      return await tryReplicate();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn("Replicate failed, trying Gemini fallback", { message });
      if (hasGemini) return tryGemini();
      throw error;
    }
  }

  if (hasGemini) {
    try {
      return await tryGemini();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn("Gemini failed, trying Replicate fallback", { message });
      if (hasReplicate) return tryReplicate();
      throw error;
    }
  }

  throw new Error(
    "No image AI configured. Set REPLICATE_API_TOKEN (primary) and/or GEMINI_API_KEY (fallback) in .env.",
  );
};
