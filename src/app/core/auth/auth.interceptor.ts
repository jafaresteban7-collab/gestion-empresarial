import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Rutas de la API que no llevan token ni disparan la renovación de sesión. */
const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/users/exists'];

/**
 * Interceptor HTTP de autenticación y autorización. Centraliza en un solo
 * punto todo lo relativo al token, de modo que los servicios de datos no saben
 * nada de cabeceras ni de sesiones:
 *
 * 1. Añade `Authorization: Bearer <JWT>` a las peticiones a la API.
 * 2. **401** (token de acceso caducado): pide un token nuevo con el de refresco
 *    y repite la petición original una sola vez. Si la renovación falla,
 *    cierra la sesión y lleva al login.
 * 3. **403** (sin permiso): lleva a la pantalla de acceso denegado.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl) || isPublic(req)) {
    return next(req);
  }
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(withToken(req, auth.token)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      if (error.status === 401 && auth.isAuthenticated()) {
        return auth.refreshSession().pipe(
          catchError(() => {
            auth.logout('expired');
            return throwError(() => error);
          }),
          switchMap((token) => next(withToken(req, token))),
        );
      }
      if (error.status === 403) {
        void router.navigateByUrl('/acceso-denegado');
      }
      return throwError(() => error);
    }),
  );
};

function isPublic(req: HttpRequest<unknown>): boolean {
  const path = req.url.slice(environment.apiUrl.length);
  return PUBLIC_ENDPOINTS.includes(path);
}

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}
