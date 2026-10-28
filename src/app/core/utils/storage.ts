/**
 * Acceso seguro a Web Storage: si el navegador lo bloquea (modo privado,
 * cookies deshabilitadas…) la aplicación sigue funcionando en memoria.
 */
export function readJson<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Guarda un valor serializado como JSON. Ignora errores de cuota o acceso. */
export function writeJson(storage: Storage | undefined, key: string, value: unknown): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible: se mantiene solo en memoria */
  }
}

/** Elimina una clave del almacenamiento. */
export function removeKey(storage: Storage | undefined, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    /* sin acceso al almacenamiento */
  }
}

/** Devuelve `localStorage` si existe en el entorno actual. */
export const local = (): Storage | undefined => (typeof localStorage === 'undefined' ? undefined : localStorage);

/** Devuelve `sessionStorage` si existe en el entorno actual. */
export const session = (): Storage | undefined =>
  typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
