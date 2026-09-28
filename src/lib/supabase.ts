import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Without these the app runs local-only (e.g. plain `npm run dev` with no .env.local).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

// PKCE returns auth codes as ?code=… rather than in the URL hash, which the HashRouter owns.
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } }) : null;
