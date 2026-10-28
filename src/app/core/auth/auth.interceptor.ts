import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Interceptor HTTP de autenticación:
 * 1. Añade la cabecera `Authorization: Bearer <JWT>` a las peticiones a la API.
 * 2. Si la API responde 401 con una sesión activa, cierra la sesión
 *    (token caducado o revocado) y redirige al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  const isApi = req.url.startsWith(environment.apiUrl);
  const authReq = isApi && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token) {
        auth.logout('expired');
      }
      return throwError(() => error);
    }),
  );
};
