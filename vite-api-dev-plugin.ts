import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  PAYMENTS_CATCH_ALL_HANDLER,
  paymentActionFromPath,
} from "./lib/api/paymentRouteRewrites";

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

const createVercelResponse = (res: ServerResponse): VercelResponse => {
  let statusCode = 200;
  const api = {
    status(code: number) {
      statusCode = code;
      return api;
    },
    json(body: unknown) {
      if (res.writableEnded) return api;
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
      return api;
    },
    setHeader(name: string, value: string | string[]) {
      res.setHeader(name, value);
      return api;
    },
    end(data?: string) {
      if (res.writableEnded) return api;
      res.statusCode = statusCode;
      res.end(data);
      return api;
    },
  } as VercelResponse;
  return api;
};

const createVercelRequest = async (
  req: IncomingMessage,
  url: URL,
  paymentAction?: string,
): Promise<VercelRequest> => {
  const rawBody = req.method === "POST" || req.method === "PUT" ? await readBody(req) : "";
  let body: unknown = rawBody;
  if (rawBody && req.headers["content-type"]?.includes("application/json")) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = rawBody;
    }
  }

  const query = Object.fromEntries(url.searchParams.entries());
  if (paymentAction) {
    query.action = paymentAction;
  }

  return {
    method: req.method,
    headers: req.headers as VercelRequest["headers"],
    body,
    query,
    url: req.url,
  } as VercelRequest;
};

const handlerPathForUrl = (pathname: string): { handlerPath: string; action?: string } | null => {
  if (!pathname.startsWith("/api/")) return null;

  const paymentAction = paymentActionFromPath(pathname);
  if (paymentAction) {
    return { handlerPath: PAYMENTS_CATCH_ALL_HANDLER, action: paymentAction };
  }

  const relative = pathname.slice("/api/".length);
  if (!relative || relative.includes("..")) return null;
  return { handlerPath: `./api/${relative}.ts` };
};

/** Runs Vercel `/api/*` handlers during `pnpm dev` (Vite does not serve them by default). */
export const vercelApiDevPlugin = (): Plugin => ({
  name: "minute-menus-vercel-api-dev",
  configureServer(server) {
    const env = loadEnv(server.config.mode, process.cwd(), "");
    Object.assign(process.env, env);

    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const resolved = handlerPathForUrl(url.pathname);
      if (!resolved) return next();

      try {
        const mod = (await server.ssrLoadModule(resolved.handlerPath)) as {
          default?: (req: VercelRequest, res: VercelResponse) => Promise<void>;
        };
        const handler = mod.default;
        if (!handler) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "API handler missing default export" }));
          return;
        }

        const vercelReq = await createVercelRequest(req, url, resolved.action);
        await handler(vercelReq, createVercelResponse(res));
      } catch (error) {
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Dev API handler failed",
            }),
          );
        }
      }
    });
  },
});
