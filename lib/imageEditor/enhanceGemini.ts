import { createLogger } from "@minute-menus/logger";
import { getPhotographyStyle, type PhotographyStyleId } from "./styles";

const log = createLogger("image-enhance-gemini");

export type EnhanceFoodPhotoInput = {
  imageBase64: string;
  mimeType: string;
  styleId: PhotographyStyleId;
  aspectRatio?: string;
};

export type GeminiEnhanceResult = {
  imageDataUrl: string;
  summary?: string;
};

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

type GeminiResponse = {
  candidates?: {
    content?: { parts?: GeminiPart[] };
  }[];
  error?: { message?: string };
};

const DEFAULT_MODEL = "gemini-2.5-flash-image";

const parseInlineImage = (part: GeminiPart): { mimeType: string; base64: string } | null => {
  const inline = part.inlineData ?? part.inline_data;
  if (!inline) return null;
  const mimeType = ("mimeType" in inline ? inline.mimeType : inline.mime_type) ?? "image/png";
  const base64 = inline.data;
  if (!base64) return null;
  return { mimeType, base64 };
};

export const parseDataUrl = (dataUrl: string): { mimeType: string; base64: string } => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL");
  return { mimeType: match[1], base64: match[2] };
};

export const enhanceWithGemini = async (
  input: EnhanceFoodPhotoInput,
): Promise<GeminiEnhanceResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const model = process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_MODEL;
  const style = getPhotographyStyle(input.styleId);
  const prompt = `${style.prompt} Return one enhanced menu-ready photograph. Do not add text, logos, or watermarks. Do not change the food itself.`;

  const body: Record<string, unknown> = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: input.mimeType, data: input.imageBase64 } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      ...(input.aspectRatio ? { imageConfig: { aspectRatio: input.aspectRatio } } : {}),
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    const detail = payload.error?.message ?? JSON.stringify(payload).slice(0, 240);
    log.error("Gemini enhance failed", { status: response.status, detail });
    if (response.status === 429) {
      throw new Error(
        "Gemini API credits are depleted. Add billing at https://aistudio.google.com/ then retry.",
      );
    }
    throw new Error(`Gemini enhancement failed: ${detail}`);
  }

  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  let summary: string | undefined;
  let imageDataUrl: string | undefined;

  for (const part of parts) {
    if (part.text?.trim()) summary = part.text.trim();
    const image = parseInlineImage(part);
    if (image) {
      imageDataUrl = `data:${image.mimeType};base64,${image.base64}`;
    }
  }

  if (!imageDataUrl) {
    throw new Error("Gemini did not return an enhanced image. Try a different style or photo.");
  }

  return { imageDataUrl, summary };
};
