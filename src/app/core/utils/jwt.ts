import type { Permission } from '../auth/permissions';
import { Role } from '../models/user.model';
import { base64UrlDecode, base64UrlEncode, sha256Hex } from './crypto';

/** Claims incluidos en el token JWT de la aplicación. */
export interface JwtPayload {
  /** Identificador del usuario. */
  sub: number | string;
  email: string;
  role: Role;
  /** Permisos efectivos del rol (solo en tokens de acceso). */
  perms?: Permission[];
  /** Tipo de token: de acceso (corta duración) o de refresco (larga duración). */
  typ?: 'access' | 'refresh';
  /** Emitido en (segundos epoch). */
  iat: number;
  /** Expira en (segundos epoch). */
  exp: number;
}

/**
 * Decodifica (sin verificar) el payload de un JWT en el cliente.
 * El cliente solo lo usa para conocer rol y expiración; la verificación
 * de la firma la realiza el servidor en cada petición.
 *
 * @returns El payload o `null` si el token está mal formado.
 */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;
    return typeof payload.exp === 'number' && payload.role ? payload : null;
  } catch {
    return null;
  }
}

/** Indica si un token ha expirado (o es inválido). */
export function isJwtExpired(token: string, now = Date.now()): boolean {
  const payload = decodeJwt(token);
  return !payload || payload.exp * 1000 <= now;
}

/**
 * Firma un JWT con un esquema HS256 simplificado (SHA-256 de `cabecera.payload.clave`).
 * Solo lo utiliza el backend simulado.
 */
export async function signJwt(payload: JwtPayload, key: string): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await sha256Hex(`${header}.${body}.${key}`);
  return `${header}.${body}.${signature}`;
}

/** Verifica firma y expiración de un JWT. Solo la usa el backend simulado. */
export async function verifyJwt(token: string, key: string): Promise<JwtPayload | null> {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) {
    return null;
  }
  const expected = await sha256Hex(`${header}.${body}.${key}`);
  if (expected !== signature || isJwtExpired(token)) {
    return null;
  }
  return decodeJwt(token);
}
