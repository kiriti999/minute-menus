import type { Category, DailyOrder, DailyOrderStatus, Dish } from "@minute-menus/types";

/** Maps a raw DB row to the app-level Category + Dish shape */
export const rowsToCategoryTree = (
    categoryRows: Array<{ id: string; title: string; sort_order: number }>,
    dishRows: Array<{
        id: string;
        category_id: string;
        name: string;
        description: string;
        price: number;
        image_url: string;
        video_url: string;
        popularity_score: number;
        prep_time: number;
        media_transform: unknown;
        stock_quantity?: number | null;
        manual_sold_out?: boolean | null;
        ingredients?: string | null;
        benefits?: string | null;
        calories?: number | null;
    }>,
): Category[] =>
    categoryRows
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((cat) => ({
            id: cat.id,
            title: cat.title,
            items: dishRows
                .filter((d) => d.category_id === cat.id)
                .map(
                    (d): Dish => ({
                        id: d.id,
                        name: d.name,
                        description: d.description,
                        price: d.price,
                        imageUrl: d.image_url,
                        videoUrl: d.video_url,
                        category: cat.id,
                        categoryTitle: cat.title,
                        ingredients: d.ingredients ?? "",
                        benefits: d.benefits ?? "",
                        calories: d.calories ?? undefined,
                        popularityScore: d.popularity_score,
                        prepTime: d.prep_time,
                        mediaTransform: d.media_transform as Dish["mediaTransform"],
                        stockQuantity: d.stock_quantity ?? undefined,
                        manualSoldOut: d.manual_sold_out ?? false,
                    }),
                ),
        }));

/** Maps raw subscription_daily_orders rows to DailyOrder app type */
export const mapDailyOrders = (
    rows: Array<{
        id: string;
        subscription_id: string;
        restaurant_id: string;
        delivery_date: string;
        dish_id: string | null;
        dish_name: string;
        status: string;
        cancelled_by: string | null;
        cancellation_reason: string | null;
        created_at: string;
        updated_at: string;
    }>,
): DailyOrder[] =>
    rows.map((r) => ({
        id: r.id,
        subscriptionId: r.subscription_id,
        restaurantId: r.restaurant_id,
        deliveryDate: r.delivery_date,
        dishId: r.dish_id ?? undefined,
        dishName: r.dish_name,
        status: r.status as DailyOrderStatus,
        cancelledBy: r.cancelled_by ?? undefined,
        cancellationReason: r.cancellation_reason ?? undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }));
