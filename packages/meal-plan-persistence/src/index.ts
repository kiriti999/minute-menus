import type { SupabaseClient } from "@supabase/supabase-js";
import { throwStepError } from "@minute-menus/errors";
import type { Database } from "@minute-menus/types/db";

export const upsertMealPlanRow = async (
    client: SupabaseClient<Database>,
    restaurantId: string,
    plan: {
        name: string;
        description: string;
        priceMonthly: number;
        deliveryFee: number;
        isActive: boolean;
    },
    planId?: string,
): Promise<string> => {
    const row = {
        restaurant_id: restaurantId,
        name: plan.name,
        description: plan.description,
        price_monthly: plan.priceMonthly,
        delivery_fee: plan.deliveryFee,
        is_active: plan.isActive,
    };

    if (planId) {
        const { error } = await client.from("meal_plans").update(row).eq("id", planId);
        if (error) throwStepError("Update meal plan", error);
        return planId;
    }

    const { data, error } = await client
        .from("meal_plans")
        .insert(row)
        .select("id")
        .single();
    if (error || !data) throwStepError("Create meal plan", error ?? "Failed to create plan");
    return data.id;
};

export const syncMealPlanDishLinks = async (
    client: SupabaseClient<Database>,
    planId: string,
    dishIds: string[],
): Promise<void> => {
    const newLinks = dishIds.map((dishId) => ({ plan_id: planId, dish_id: dishId }));
    if (newLinks.length > 0) {
        const { error: upsertErr } = await client
            .from("meal_plan_dishes")
            .upsert(newLinks, { onConflict: "plan_id,dish_id" });
        if (upsertErr) throwStepError("Sync meal plan dishes", upsertErr);
    }

    if (dishIds.length === 0) {
        const { error } = await client.from("meal_plan_dishes").delete().eq("plan_id", planId);
        if (error) throwStepError("Clear meal plan dishes", error);
        return;
    }

    const { data: existing, error: existingErr } = await client
        .from("meal_plan_dishes")
        .select("dish_id")
        .eq("plan_id", planId);
    if (existingErr) throwStepError("Load meal plan dishes", existingErr);

    const kept = new Set(dishIds);
    const toDelete = (existing ?? [])
        .map((link) => link.dish_id)
        .filter((dishId) => !kept.has(dishId));
    if (toDelete.length === 0) return;

    const { error: deleteErr } = await client
        .from("meal_plan_dishes")
        .delete()
        .eq("plan_id", planId)
        .in("dish_id", toDelete);
    if (deleteErr) throwStepError("Delete meal plan dishes", deleteErr);
};
