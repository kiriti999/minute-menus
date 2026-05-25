import type { VercelRequest, VercelResponse } from "@vercel/node";

export const setCorsPreflightHeaders = (res: VercelResponse): void => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
};

export const rejectUnlessPost = (req: VercelRequest, res: VercelResponse): boolean => {
    if (req.method === "OPTIONS") {
        setCorsPreflightHeaders(res);
        res.status(200).end();
        return true;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return true;
    }
    return false;
};

export const parseSoldOutPayload = (
    body: unknown,
): { to: string; restaurantName: string; dishName: string; reason: "stock" | "manual" } | null => {
    const payload = body as Partial<{
        to: string;
        restaurantName: string;
        dishName: string;
        reason: "stock" | "manual";
    }>;
    if (!payload.to || !payload.restaurantName || !payload.dishName || !payload.reason) {
        return null;
    }
    return {
        to: payload.to,
        restaurantName: payload.restaurantName,
        dishName: payload.dishName,
        reason: payload.reason,
    };
};

export const soldOutEmailSubject = (
    restaurantName: string,
    dishName: string,
    reason: "stock" | "manual",
): string =>
    reason === "manual"
        ? `[${restaurantName}] "${dishName}" marked as Sold Out`
        : `[${restaurantName}] "${dishName}" is now Sold Out (stock depleted)`;
