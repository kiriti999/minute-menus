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
                    created_at?: string;
                };
                Relationships: [];
            };
            orders: {
                Row: {
                    id: string;
                    restaurant_id: string;
                    items: Json;
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
        };
        Views: { [_ in never]?: never };
        Functions: { [_ in never]?: never };
        Enums: { [_ in never]?: never };
        CompositeTypes: { [_ in never]?: never };
    };
};
