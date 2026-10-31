// Genera src/environments/supabase.config.ts con la URL y la clave pública (anon)
// de Supabase. Orden de búsqueda:
//   1. GP_SUPABASE_URL / GP_SUPABASE_ANON_KEY (secretos de GitHub en el pipeline)
//   2. SUPABASE_URL / SUPABASE_ANON_KEY (variables de entorno)
//   3. el fichero .env.local (desarrollo)
// Se descartan valores no válidos, como el "[SENSITIVE]" que devuelve Vercel con
// variables sensibles. Sin valores válidos, la app usa el backend simulado.
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
const normalizeUrl = (value) =>
  (value ?? '')
    .trim()
    .replace(/\/(rest|auth)\/v1\/?$/, '')
    .replace(/\/+$/, '');
const candidates = [
  [process.env.GP_SUPABASE_URL, process.env.GP_SUPABASE_ANON_KEY],
  [process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY],
  [local.SUPABASE_URL, local.SUPABASE_ANON_KEY],
]
  .map(([u, k]) => [normalizeUrl(u), (k ?? '').trim()])
  .filter(([u, k]) => /^https:\/\/[^\s[\]]+$/.test(u) && /^[\w.-]{20,}$/.test(k));
const [url, key] = candidates[0] ?? ['', ''];

writeFileSync(
  'src/environments/supabase.config.ts',
  `// Generado por scripts/supabase-config.mjs: no editar ni subir al repositorio.
/** Proyecto de Supabase (vacío = backend simulado). La clave es la pública (anon), protegida por RLS. */
export const supabaseConfig = { url: ${JSON.stringify(url)}, key: ${JSON.stringify(key)} };
`,
);
console.log(url ? `Supabase configurado: ${url}` : 'Supabase sin configurar: se usará el backend simulado.');
