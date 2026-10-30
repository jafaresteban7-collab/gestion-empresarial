import { Role } from '../models/user.model';

/**
 * Permisos de la aplicación con formato `recurso:acción`.
 * Las vistas, los guards y el backend comprueban permisos, nunca roles:
 * así añadir un rol nuevo solo exige ampliar {@link ROLE_PERMISSIONS}.
 */
export type Permission =
  | 'productos:ver'
  | 'productos:editar'
  | 'pedidos:ver'
  | 'informes:exportar'
  | 'dashboard:ver'
  | 'usuarios:gestionar';

/** Permisos del Usuario estándar: consulta y exportación. */
const USER_PERMISSIONS: readonly Permission[] = ['productos:ver', 'pedidos:ver', 'informes:exportar'];

/**
 * Matriz RBAC rol → permisos. Los roles son jerárquicos: el Administrador
 * hereda todos los permisos del Usuario estándar y añade los de gestión.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  user: USER_PERMISSIONS,
  admin: [...USER_PERMISSIONS, 'productos:editar', 'dashboard:ver', 'usuarios:gestionar'],
};

/** Permisos concedidos a un rol (vacío si el rol no existe). */
export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
