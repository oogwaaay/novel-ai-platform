import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Centralized Supabase admin client (server-side only).
 *
 * 使用 service_role key，只能在后端运行，绝不能暴露到前端。
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: SupabaseClient | null = null;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[Supabase] SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 未配置，后端将回退到内存存储。'
  );
} else {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  });
}

export { supabaseAdmin };






