/**
 * Configuración de producción.
 * `useMockBackend` activa la API REST (SQL) y la base de datos en tiempo real
 * (NoSQL) simuladas, de modo que el despliegue no depende de servicios externos
 * ni expone claves de terceros.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
  useMockBackend: true,
  /** Latencia simulada de red en milisegundos. */
  mockLatencyMs: 450,
  /** Intervalo (ms) con el que "otros clientes" crean pedidos en tiempo real. */
  realtimeIntervalMs: 12000,
};
