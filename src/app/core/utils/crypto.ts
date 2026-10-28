/**
 * Utilidades criptográficas basadas en la Web Crypto API (asíncronas,
 * no bloquean el hilo principal).
 */

/** Calcula el hash SHA-256 de un texto y lo devuelve en hexadecimal. */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hash de contraseña con sal: `sha256(sal:contraseña)`. */
export function hashPassword(salt: string, password: string): Promise<string> {
  return sha256Hex(`${salt}:${password}`);
}

/** Genera una sal aleatoria. */
export function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Codifica una cadena UTF-8 en Base64URL. */
export function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decodifica una cadena Base64URL a texto UTF-8. */
export function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
