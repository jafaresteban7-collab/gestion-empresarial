import { supabaseConfig } from './supabase.config';

/** Configuración de desarrollo (ver `environment.ts`). */
export const environment = {
  production: false,
  apiUrl: '/api',
  supabase: supabaseConfig,
  useMockBackend: !supabaseConfig.url,
  mockLatencyMs: 450,
  realtimeIntervalMs: 12000,
};
