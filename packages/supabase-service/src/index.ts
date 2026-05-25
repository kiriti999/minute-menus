import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@minute-menus/types/db";
import { SupabaseService } from "./service";

export { SupabaseService } from "./service";
export { mapDailyOrders, rowsToCategoryTree } from "./mappers";
export { createRestaurantContext, generateUniqueSlug, slugify } from "./restaurantContext";

export const createSupabaseService = (client: SupabaseClient<Database>): SupabaseService =>
    new SupabaseService(client);
