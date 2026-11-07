// Replace these placeholders with the Project URL and publishable key from Supabase.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://apbwlxvzhbjpvlgtjtyk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Ws3H6pNvzXKfx62JCcOmQA_7UI6uXiL";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
