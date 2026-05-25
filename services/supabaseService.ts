import { createSupabaseService } from "@minute-menus/supabase-service";
import { supabase } from "../lib/supabase";

export const supabaseService = createSupabaseService(supabase);
