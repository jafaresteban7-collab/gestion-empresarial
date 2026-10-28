import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Role } from '../models/user.model';
import { AuthService } from './auth.service';

/**
 * Permite el acceso solo a usuarios autenticados.
 * Se usa `canMatch` para que el código de las rutas protegidas (lazy loading)
 * ni siquiera se descargue si el usuario no tiene sesión.
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
 * Restringe una ruta a los roles indicados en `data.roles`.
 *
 * @example
 * { path: 'dashboard', canMatch: [roleGuard], data: { roles: ['admin'] }, loadComponent: … }
 */
export const roleGuard: CanMatchFn = (route) => {
  const roles = (route.data?.['roles'] ?? []) as Role[];
  const auth = inject(AuthService);
  if (roles.length === 0 || auth.hasRole(roles)) {
    return true;
  }
  return inject(Router).createUrlTree(['/acceso-denegado']);
};
