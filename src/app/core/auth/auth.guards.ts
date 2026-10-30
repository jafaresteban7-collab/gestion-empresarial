import { inject } from '@angular/core';
import { CanDeactivateFn, CanMatchFn, Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';
import { AuthService } from './auth.service';
import { Permission } from './permissions';

/**
 * Permite el acceso solo a usuarios autenticados.
 * Se usa `canMatch` para que el código de las rutas protegidas (lazy loading)
 * ni siquiera se descargue si el usuario no tiene sesión. La URL pedida viaja
 * en `returnUrl` para volver a ella tras iniciar sesión.
 */
export const authGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) {
    return true;
  }
  const returnUrl = '/' + segments.map((s) => s.path).join('/');
  return inject(Router).createUrlTree(['/login'], { queryParams: returnUrl !== '/' ? { returnUrl } : {} });
};

/** Impide volver a login/registro si ya hay sesión iniciada. */
export const guestGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? inject(Router).createUrlTree(['/inicio']) : true;
};

/**
 * Restringe una ruta a quien tenga todos los permisos de `data.permissions`.
 * Comprueba permisos y no roles, así la ruta no cambia si se añade un rol nuevo.
 *
 * @example
 * { path: 'dashboard', canMatch: [permissionGuard], data: { permissions: ['dashboard:ver'] }, loadComponent: … }
 */
export const permissionGuard: CanMatchFn = (route) => {
  const required = (route.data?.['permissions'] ?? []) as Permission[];
  if (inject(AuthService).canAll(required)) {
    return true;
  }
  return inject(Router).createUrlTree(['/acceso-denegado']);
};

/** Contrato de las vistas que pueden tener cambios sin guardar. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Pide confirmación antes de abandonar una vista con cambios sin guardar
 * (por ejemplo, el formulario de producto a medio rellenar).
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component.hasUnsavedChanges() ||
  inject(NotificationService).confirm(
    'Cambios sin guardar',
    'Si sale ahora, perderá los datos introducidos en el formulario.',
    'Salir sin guardar',
  );
