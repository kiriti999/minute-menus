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
  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/webp";
  const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
  return `data:${contentType};base64,${base64}`;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const pollPrediction = async (
  getUrl: string,
  token: string,
  deadlineMs: number,
): Promise<PredictionResponse> => {
  while (Date.now() < deadlineMs) {
    const poll = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await poll.json()) as PredictionResponse;
    if (!poll.ok) {
      const detail = payload.detail ?? payload.error ?? JSON.stringify(payload).slice(0, 240);
      throw new Error(`Replicate poll failed: ${detail}`);
    }
    if (payload.status === "succeeded" || payload.status === "failed" || payload.status === "canceled") {
      return payload;
    }
    await sleep(2000);
  }
  throw new Error("Replicate enhancement timed out. Try again in a moment.");
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
    },
    body: JSON.stringify(body),
  });

  const created = (await response.json()) as PredictionResponse & {
    id?: string;
    urls?: { get?: string };
  };
  if (!response.ok) {
    const detail = created.detail ?? created.error ?? JSON.stringify(created).slice(0, 240);
    log.error("Replicate enhance failed", { status: response.status, detail, model });
    throw new Error(`Replicate enhancement failed: ${detail}`);
  }

  const getUrl =
    created.urls?.get ??
    (created.id ? `https://api.replicate.com/v1/predictions/${created.id}` : null);
  if (!getUrl) {
    throw new Error("Replicate did not return a prediction URL");
  }

  const deadlineMs = Date.now() + 110_000;
  const payload =
    created.status === "succeeded" || created.status === "failed"
      ? created
      : await pollPrediction(getUrl, token, deadlineMs);

  if (payload.status === "failed" || payload.status === "canceled") {
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
