import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

declare global {
  var __namasteSupabaseClient: any;
  var __namasteAuthedClientByToken: Map<string, any> | undefined;
}

export const supabase = globalThis.__namasteSupabaseClient
  ?? createClient(supabaseUrl, supabaseAnonKey);

globalThis.__namasteSupabaseClient = supabase;

const authedClientByToken = globalThis.__namasteAuthedClientByToken
  ?? new Map<string, any>();

globalThis.__namasteAuthedClientByToken = authedClientByToken;

export const createAuthedSupabaseClient = (accessToken: string) => {
  const cached = authedClientByToken.get(accessToken);
  if (cached) {
    return cached;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      storageKey: 'sb-stateless-bearer-auth-token',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  authedClientByToken.set(accessToken, client);
  return client;
};
