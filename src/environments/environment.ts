import { supabaseConfig } from './supabase.config';

/**
 * Configuración de producción.
 * - Origen SQL: Supabase (PostgreSQL + API REST) si `supabase` tiene URL y clave;
 *   si no, una API REST simulada en el navegador (pruebas y desarrollo sin red).
 * - Origen NoSQL en tiempo real: base de datos documental simulada.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
  /** Proyecto de Supabase, inyectado al compilar desde variables de entorno. */
  supabase: supabaseConfig,
  useMockBackend: !supabaseConfig.url,
  /** Latencia simulada de red en milisegundos. */
  mockLatencyMs: 450,
  /** Intervalo (ms) con el que "otros clientes" crean pedidos en tiempo real. */
  realtimeIntervalMs: 12000,
};
