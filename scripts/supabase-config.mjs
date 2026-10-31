// Genera src/environments/supabase.config.ts con la URL y la clave pública (anon)
// de Supabase. Los valores salen de las variables de entorno SUPABASE_URL y
// SUPABASE_ANON_KEY (Vercel / CI) o, en local, del fichero .env.local.
// Sin valores, la app usa el backend simulado (pruebas y desarrollo sin red).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const local = existsSync('.env.local')
  ? Object.fromEntries(
      readFileSync('.env.local', 'utf8')
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
        .filter(Boolean)
        .map(([, key, value]) => [key, value.replace(/^["']|["']$/g, '')]),
    )
  : {};

// Acepta la URL del proyecto aunque se copie con /rest/v1 al final
const url = (process.env.SUPABASE_URL ?? local.SUPABASE_URL ?? '')
  .trim()
  .replace(/\/(rest|auth)\/v1\/?$/, '')
  .replace(/\/+$/, '');
const key = (process.env.SUPABASE_ANON_KEY ?? local.SUPABASE_ANON_KEY ?? '').trim();

writeFileSync(
  'src/environments/supabase.config.ts',
  `// Generado por scripts/supabase-config.mjs: no editar ni subir al repositorio.
/** Proyecto de Supabase (vacío = backend simulado). La clave es la pública (anon), protegida por RLS. */
export const supabaseConfig = { url: ${JSON.stringify(url)}, key: ${JSON.stringify(key)} };
`,
);
console.log(url ? `Supabase configurado: ${url}` : 'Supabase sin configurar: se usará el backend simulado.');
