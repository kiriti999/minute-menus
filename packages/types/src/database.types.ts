// Auto-generated types for Supabase tables.
// Re-run `pnpm supabase gen types typescript` after schema changes.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
    public: {
        Tables: {
            restaurants: {
                Row: {
                    id: string;
                    owner_id: string;
                    name: string;
                    slug: string;
                    currency: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    owner_id: string;
                    name: string;
                    slug: string;
                    currency?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    owner_id?: string;
                    name?: string;
                    slug?: string;
                    currency?: string;
                    created_at?: string;
                };
                Relationships: [];
            };
            categories: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    title: string;
                    sort_order: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    title: string;
                    sort_order?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    title?: string;
                    sort_order?: number;
                    created_at?: string;
                };
                Relationships: [];
            };
            dishes: {
                Row: {
                    id: string;
                    category_id: string;
                    restaurant_id: string;
                    name: string;
                    description: string;
                    price: number;
                    image_url: string;
                    video_url: string;
                    popularity_score: number;
                    prep_time: number;
                    media_transform: Json | null;
                    stock_quantity: number | null;
                    manual_sold_out: boolean;
                    ingredients?: string;
                    benefits?: string;
                    calories?: number | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    category_id: string;
                    restaurant_id: string;
                    name: string;
                    description?: string;
                    price?: number;
                    image_url?: string;
                    video_url?: string;
                    popularity_score?: number;
                    prep_time?: number;
                    media_transform?: Json | null;
                    stock_quantity?: number | null;
                    manual_sold_out?: boolean;
                    ingredients?: string;
                    benefits?: string;
                    calories?: number | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    category_id?: string;
                    restaurant_id?: string;
                    name?: string;
                    description?: string;
                    price?: number;
                    image_url?: string;
                    video_url?: string;
                    popularity_score?: number;
                    prep_time?: number;
                    media_transform?: Json | null;
                    stock_quantity?: number | null;
                    manual_sold_out?: boolean;
                    ingredients?: string;
                    benefits?: string;
                    calories?: number | null;
                    created_at?: string;
                };
                Relationships: [];
            };
            dish_stock_daily: {
                Row: {
                    dish_id: string;
                    restaurant_id: string;
                    sold_date: string;
                    quantity_sold: number;
                };
                Insert: {
                    dish_id: string;
                    restaurant_id: string;
                    sold_date?: string;
                    quantity_sold?: number;
                };
                Update: {
                    dish_id?: string;
                    restaurant_id?: string;
                    sold_date?: string;
                    quantity_sold?: number;
                };
                Relationships: [];
            };
            orders: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    items: Json;
                    subtotal_amount: number | null;
                    gst_amount: number;
                    total_amount: number;
                    status: string;
                    payment_provider: string | null;
                    payment_id: string | null;
                    time_to_order: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    items?: Json;
                    subtotal_amount?: number | null;
                    gst_amount?: number;
                    total_amount?: number;
                    status?: string;
                    payment_provider?: string | null;
                    payment_id?: string | null;
                    time_to_order?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    items?: Json;
                    subtotal_amount?: number | null;
                    gst_amount?: number;
                    total_amount?: number;
                    status?: string;
                    payment_provider?: string | null;
                    payment_id?: string | null;
                    time_to_order?: number;
                    created_at?: string;
                };
                Relationships: [];
            };
            watch_sessions: {
                Row: {
                    id: string;
                    dish_id: string;
                    restaurant_id: string;
                    duration: number;
                    completed: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    dish_id: string;
                    restaurant_id: string;
                    duration?: number;
                    completed?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    dish_id?: string;
                    restaurant_id?: string;
                    duration?: number;
                    completed?: boolean;
                    created_at?: string;
                };
                Relationships: [];
            };
            subscriptions: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    tier: string;
                    provider: string | null;
                    provider_subscription_id: string | null;
                    current_period_end: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    tier?: string;
                    provider?: string | null;
                    provider_subscription_id?: string | null;
                    current_period_end?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    tier?: string;
                    provider?: string | null;
                    provider_subscription_id?: string | null;
                    current_period_end?: string | null;
                    created_at?: string;
                };
                Relationships: [];
            };
            meal_plans: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    name: string;
                    description: string;
                    price_monthly: number;
                    delivery_fee: number;
                    is_active: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    name: string;
                    description?: string;
                    price_monthly?: number;
                    delivery_fee?: number;
                    is_active?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    name?: string;
                    description?: string;
                    price_monthly?: number;
                    delivery_fee?: number;
                    is_active?: boolean;
                    created_at?: string;
                };
                Relationships: [];
            };
            meal_plan_dishes: {
                Row: { plan_id: string; dish_id: string };
                Insert: { plan_id: string; dish_id: string };
                Update: { plan_id?: string; dish_id?: string };
                Relationships: [];
            };
            customer_subscriptions: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    plan_id: string;
                    customer_name: string;
                    phone: string;
                    email: string | null;
                    delivery_type: "delivery" | "pickup";
                    time_slot: "08-09" | "12-14" | "19-21";
                    status: "active" | "paused" | "cancelled";
                    pause_until: string | null;
                    paused_days_used: number;
                    start_date: string;
                    end_date: string;
                    created_at: string;
                    rotation_dish_ids: string[] | null;
                    payment_provider: string | null;
                    payment_id: string | null;
                    subtotal_amount: number | null;
                    gst_amount: number;
                };
                Insert: {
                    id?: string;
                    restaurant_id: string;
                    plan_id: string;
                    customer_name: string;
                    phone: string;
                    email?: string | null;
                    delivery_type: "delivery" | "pickup";
                    delivery_fee_mode?: "upfront" | "cash_on_delivery";
                    time_slot: "08-09" | "12-14" | "19-21";
                    status?: "active" | "paused" | "cancelled";
                    pause_until?: string | null;
                    paused_days_used?: number;
                    start_date?: string;
                    end_date: string;
                    created_at?: string;
                    rotation_dish_ids?: string[] | null;
                    payment_provider?: string | null;
                    payment_id?: string | null;
                    subtotal_amount?: number | null;
                    gst_amount?: number;
                };
                Update: {
                    id?: string;
                    restaurant_id?: string;
                    plan_id?: string;
                    customer_name?: string;
                    phone?: string;
                    email?: string | null;
                    delivery_type?: "delivery" | "pickup";
                    delivery_fee_mode?: "upfront" | "cash_on_delivery";
                    time_slot?: "08-09" | "12-14" | "19-21";
                    status?: "active" | "paused" | "cancelled";
                    pause_until?: string | null;
                    paused_days_used?: number;
                    start_date?: string;
                    end_date?: string;
                    created_at?: string;
                    rotation_dish_ids?: string[] | null;
                    payment_provider?: string | null;
                    payment_id?: string | null;
                    subtotal_amount?: number | null;
                    gst_amount?: number;
                };
                Relationships: [];
            };
            subscription_daily_orders: {
                Row: {
                    id: string;
                    subscription_id: string;
                    restaurant_id: string;
                    delivery_date: string;
                    dish_id: string | null;
                    dish_name: string;
                    status: "pending" | "delivered" | "cancelled" | "skipped";
                    cancelled_by: string | null;
                    cancellation_reason: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    subscription_id: string;
                    restaurant_id: string;
                    delivery_date: string;
                    dish_id?: string | null;
                    dish_name?: string;
                    status?: "pending" | "delivered" | "cancelled" | "skipped";
                    cancelled_by?: string | null;
                    cancellation_reason?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    subscription_id?: string;
                    restaurant_id?: string;
                    delivery_date?: string;
                    dish_id?: string | null;
                    dish_name?: string;
                    status?: "pending" | "delivered" | "cancelled" | "skipped";
                    cancelled_by?: string | null;
                    cancellation_reason?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            subscription_refund_requests: {
                Row: {
                    id: string;
                    subscription_id: string;
                    restaurant_id: string;
                    reason: string;
                    amount: number;
                    status: "pending" | "approved" | "rejected" | "processed";
                    restaurant_notes: string | null;
                    created_at: string;
                    processed_at: string | null;
                };
                Insert: {
                    id?: string;
                    subscription_id: string;
                    restaurant_id: string;
                    reason: string;
                    amount?: number;
                    status?: "pending" | "approved" | "rejected" | "processed";
                    restaurant_notes?: string | null;
                    created_at?: string;
                    processed_at?: string | null;
                };
                Update: {
                    id?: string;
                    subscription_id?: string;
                    restaurant_id?: string;
                    reason?: string;
                    amount?: number;
                    status?: "pending" | "approved" | "rejected" | "processed";
                    restaurant_notes?: string | null;
                    created_at?: string;
                    processed_at?: string | null;
                };
                Relationships: [];
            };
            delivery_tickets: {
                Row: {
                    id: string;
                    subscription_id: string;
                    daily_order_id: string;
                    restaurant_id: string;
                    reason: "not_received" | "wrong_item" | "partial_delivery" | "damaged" | "late_delivery" | "other";
                    notes: string | null;
                    status: "open" | "investigating" | "resolved";
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    subscription_id: string;
                    daily_order_id: string;
                    restaurant_id: string;
                    reason: "not_received" | "wrong_item" | "partial_delivery" | "damaged" | "late_delivery" | "other";
                    notes?: string | null;
                    status?: "open" | "investigating" | "resolved";
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    subscription_id?: string;
                    daily_order_id?: string;
                    restaurant_id?: string;
                    reason?: "not_received" | "wrong_item" | "partial_delivery" | "damaged" | "late_delivery" | "other";
                    notes?: string | null;
                    status?: "open" | "investigating" | "resolved";
                    created_at?: string;
                };
                Relationships: [];
            };
            delivery_adjustments: {
                Row: {
                    id: string;
                    ticket_id: string;
                    notes: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    ticket_id: string;
                    notes: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    ticket_id?: string;
                    notes?: string;
                    created_at?: string;
                };
                Relationships: [];
            };
            customer_profiles: {
                Row: {
                    id: string;
                    user_id: string;
                    email: string;
                    email_verified: boolean;
                    phone: string | null;
                    name: string | null;
                    address_line1: string | null;
                    address_line2: string | null;
                    street: string | null;
                    area: string | null;
                    landmark: string | null;
                    city: string | null;
                    state: string | null;
                    pincode: string | null;
                    lat: number | null;
                    lng: number | null;
                    formatted_address: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    email: string;
                    email_verified?: boolean;
                    phone?: string | null;
                    name?: string | null;
                    address_line1?: string | null;
                    address_line2?: string | null;
                    street?: string | null;
                    area?: string | null;
                    landmark?: string | null;
                    city?: string | null;
                    state?: string | null;
                    pincode?: string | null;
                    lat?: number | null;
                    lng?: number | null;
                    formatted_address?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    email?: string;
                    email_verified?: boolean;
                    phone?: string | null;
                    name?: string | null;
                    address_line1?: string | null;
                    address_line2?: string | null;
                    street?: string | null;
                    area?: string | null;
                    landmark?: string | null;
                    city?: string | null;
                    state?: string | null;
                    pincode?: string | null;
                    lat?: number | null;
                    lng?: number | null;
                    formatted_address?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
        };
        Views: { [_ in never]?: never };
        Functions: {
            increment_dish_stock: {
                Args: {
                    p_dish_id: string;
                    p_restaurant_id: string;
                    p_sold_date: string;
                    p_quantity: number;
                };
                Returns: void;
            };
            upsert_daily_selection: {
                Args: {
                    p_phone: string;
                    p_restaurant_id: string;
                    p_delivery_date: string;
                    p_dish_id: string;
                };
                Returns: string;
            };
            update_subscription_status: {
                Args: {
                    p_phone: string;
                    p_restaurant_id: string;
                    p_new_status: "active" | "paused" | "cancelled";
                    p_pause_until?: string | null;
                    p_cancel_reason?: string | null;
                };
                Returns: string;
            };
        };
        Enums: { [_ in never]?: never };
        CompositeTypes: { [_ in never]?: never };
    };
};
