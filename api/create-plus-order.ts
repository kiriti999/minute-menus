/**
 * POST /api/create-plus-order
 * Creates a Razorpay order for an owner's Plus tier upgrade.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runPostHandler } from "../lib/api/runPostHandler";
import { handleCreatePlusOrder } from "../lib/api-handlers/payments/create-plus-order";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    await runPostHandler(req, res, handleCreatePlusOrder, "create-plus-order");
}
