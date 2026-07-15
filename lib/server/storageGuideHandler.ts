import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateStoragePreservationGuide } from "@minute-menus/ai";
import type { MenuItemForStorageGuide, StorageGuideResult } from "@minute-menus/types";
import { requireSupabaseAdminOrThrow, verifyOwnerForRestaurant } from "../verifyOwnerRestaurant";
import { fetchOwnerAnthropicKey } from "./ownerAiKey";

type StorageGuideBody = {
	action: "storage-guide";
	restaurantId?: string;
	menuItems?: MenuItemForStorageGuide[];
};

export async function handleStorageGuideRequest(req: VercelRequest, res: VercelResponse): Promise<void> {
	const { restaurantId, menuItems } = req.body as StorageGuideBody;
	if (!restaurantId || !Array.isArray(menuItems) || menuItems.length === 0) {
		res.status(400).json({ error: "restaurantId and menuItems are required" });
		return;
	}

	const auth = await verifyOwnerForRestaurant(req, restaurantId);
	if (!auth) {
		res.status(403).json({ error: "Not allowed for this restaurant" });
		return;
	}

	const admin = requireSupabaseAdminOrThrow();
	const keyRow = await fetchOwnerAnthropicKey(admin, auth.userId);
	if (!keyRow) {
		res.status(428).json({ error: "missing_api_key", message: "Add your Claude API key to generate a storage guide." });
		return;
	}

	const { data: restaurant, error: restErr } = await admin
		.from("restaurants")
		.select("name")
		.eq("id", restaurantId)
		.single();
	if (restErr || !restaurant) {
		res.status(404).json({ error: "Restaurant not found" });
		return;
	}

	const sanitized = menuItems
		.map((item) => ({
			name: String(item.name ?? "").trim(),
			category: String(item.category ?? "").trim(),
			ingredients: String(item.ingredients ?? "").trim(),
		}))
		.filter((item) => item.name.length > 0);

	if (!sanitized.length) {
		res.status(400).json({ error: "No menu items with names to scan" });
		return;
	}

	try {
		const tips = await generateStoragePreservationGuide(
			keyRow.apiKey,
			restaurant.name,
			sanitized,
			keyRow.model,
		);
		const result: StorageGuideResult = {
			generatedAt: new Date().toISOString(),
			restaurantName: restaurant.name,
			tips,
		};
		res.status(200).json(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[storage-guide] failed", message);
		res.status(502).json({ error: "Failed to generate storage guide", detail: message });
	}
}
