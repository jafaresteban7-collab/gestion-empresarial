import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const router = { navigateByUrl: vi.fn() };
  const authStub = {
    token: 'viejo' as string | null,
    isAuthenticated: vi.fn(() => true),
    refreshSession: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authStub.token = 'viejo';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authStub },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('añade la cabecera Authorization a la API y no a las rutas públicas', () => {
    http.get('/api/products').subscribe();
    http.post('/api/auth/login', {}).subscribe();
    expect(backend.expectOne('/api/products').request.headers.get('Authorization')).toBe('Bearer viejo');
    expect(backend.expectOne('/api/auth/login').request.headers.has('Authorization')).toBe(false);
  });

  it('ante un 401 renueva el token y repite la petición', () => {
    authStub.refreshSession.mockReturnValue(of('nuevo'));
    let body: unknown;
    http.get('/api/products').subscribe((b) => (body = b));
    backend.expectOne('/api/products').flush(null, { status: 401, statusText: 'Unauthorized' });
    const retry = backend.expectOne('/api/products');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer nuevo');
    retry.flush([{ id: 1 }]);
    expect(body).toEqual([{ id: 1 }]);
    expect(authStub.logout).not.toHaveBeenCalled();
  });

  it('si la renovación falla, cierra la sesión y propaga el 401', () => {
    authStub.refreshSession.mockReturnValue(throwError(() => new Error('caducado')));
    let error: HttpErrorResponse | undefined;
    http.get('/api/products').subscribe({ error: (e) => (error = e) });
    backend.expectOne('/api/products').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(authStub.logout).toHaveBeenCalledWith('expired');
    expect(error?.status).toBe(401);
  });

  it('ante un 403 lleva a la pantalla de acceso denegado', () => {
    http.delete('/api/products/1').subscribe({ error: () => undefined });
    backend.expectOne('/api/products/1').flush(null, { status: 403, statusText: 'Forbidden' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/acceso-denegado');
    expect(authStub.refreshSession).not.toHaveBeenCalled();
  });
});
