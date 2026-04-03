import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { WebViewStorage } from '@/lib/webview-storage';
import { requireSupabaseAnonKey, requireSupabaseUrl } from '@/lib/supabaseEnv';

const SUPABASE_URL = requireSupabaseUrl();
const SUPABASE_ANON_KEY = requireSupabaseAnonKey();

const isWebView = /wv|WebView/i.test(navigator.userAgent);
const storage = isWebView ? new WebViewStorage() : localStorage;

if (import.meta.env.DEV) {
  console.log(`Supabase client: ${isWebView ? 'WebViewStorage' : 'localStorage'}`);
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storage as any,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
