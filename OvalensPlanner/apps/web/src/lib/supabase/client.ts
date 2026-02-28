import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Browser Supabase client for auth and data. Null if env vars are not set. */
export const supabase =
  url && key ? createBrowserClient(url, key) : (null as ReturnType<typeof createBrowserClient> | null);
