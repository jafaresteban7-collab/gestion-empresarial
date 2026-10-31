/**
 * Roles disponibles en la aplicación.
 * - `admin`: Administrador con acceso total (cuadro de mando, CRUD, usuarios).
 * - `user`: Usuario estándar con acceso de consulta y exportación.
 */
export type Role = 'admin' | 'user';

/** Etiquetas legibles de cada rol. */
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  user: 'Usuario estándar',
};

/** Usuario público (nunca contiene credenciales). */
export interface User {
  /** Numérico en el backend simulado; UUID de Supabase Auth con Supabase. */
  id: number | string;
  name: string;
  email: string;
  role: Role;
  department: string;
  createdAt: string;
}

/** Registro de usuario tal como se guarda en la "tabla" SQL simulada. */
export interface UserRecord extends User {
  /** En la tabla simulada la clave primaria es numérica. */
  id: number;
  /** Sal única por usuario. */
  salt: string;
  /** Hash SHA-256 de `sal:contraseña`. Nunca se guarda la contraseña en claro. */
  passwordHash: string;
}

/** Sesión activa del usuario autenticado. */
export interface Session {
  /** Token de acceso (JWT de corta duración). */
  token: string;
  /** Token de refresco con el que se obtiene un nuevo token de acceso. */
  refreshToken: string;
  user: User;
  /** Instante de expiración (epoch ms) del token de acceso, según su claim `exp`. */
  expiresAt: number;
  /** Instante de expiración (epoch ms) del token de refresco: fin real de la sesión. */
  refreshExpiresAt: number;
}

/** Cuerpo de la petición de inicio de sesión. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Respuesta de la API de autenticación. */
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

/** Cuerpo de la petición de alta de usuario. */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  department: string;
}

/** Departamentos de la empresa (datos sintéticos). */
export const DEPARTMENTS = ['Dirección', 'Compras', 'Ventas', 'Logística', 'Sistemas'] as const;
