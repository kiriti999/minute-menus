import { createLogger } from "@minute-menus/logger";
import { getPhotographyStyle, type PhotographyStyleId } from "./styles";

const log = createLogger("image-enhance-replicate");

export type ReplicateEnhanceInput = {
  imageDataUrl: string;
  styleId: PhotographyStyleId;
};

export type ReplicateEnhanceResult = {
  imageDataUrl: string;
  summary?: string;
};

const DEFAULT_MODEL = "black-forest-labs/flux-kontext-dev";

type PredictionResponse = {
  status?: string;
  output?: string | string[];
  error?: string;
  detail?: string;
};

const urlToDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download enhanced image (${response.status})`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to encode enhanced image"));
    reader.readAsDataURL(blob);
  });
};

export const enhanceWithReplicate = async (
  input: ReplicateEnhanceInput,
): Promise<ReplicateEnhanceResult> => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN is not configured. Add it to .env.");
  }

  const model = process.env.REPLICATE_IMAGE_MODEL ?? DEFAULT_MODEL;
  const style = getPhotographyStyle(input.styleId);

  const body = {
    input: {
      prompt: `${style.prompt} Keep the same food dish, ingredients, and portions. Professional menu photography.`,
      input_image: input.imageDataUrl,
      aspect_ratio: "match_input_image",
      go_fast: true,
      guidance: 2.5,
      num_inference_steps: 28,
      output_format: "webp",
      output_quality: 90,
    },
  };

  const response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=120",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as PredictionResponse;
  if (!response.ok) {
    const detail = payload.detail ?? payload.error ?? JSON.stringify(payload).slice(0, 240);
    log.error("Replicate enhance failed", { status: response.status, detail, model });
    throw new Error(`Replicate enhancement failed: ${detail}`);
  }

  if (payload.status === "failed") {
    throw new Error(payload.error ?? "Replicate enhancement failed");
  }

  const outputUrl = Array.isArray(payload.output) ? payload.output[0] : payload.output;
  if (!outputUrl || typeof outputUrl !== "string") {
    throw new Error("Replicate did not return an image URL");
  }

  const imageDataUrl = await urlToDataUrl(outputUrl);
  return {
    imageDataUrl,
    summary: `Enhanced with Replicate (${model.replace("/", " · ")})`,
  };
};
