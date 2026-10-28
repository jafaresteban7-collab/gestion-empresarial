import { TestBed } from '@angular/core/testing';
import { Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard, roleGuard } from './auth.guards';

describe('guards de rutas', () => {
  const authStub = { isAuthenticated: vi.fn(), hasRole: vi.fn() };
  const run = (guard: typeof authGuard, route: Route = {}, segments: UrlSegment[] = []) =>
    TestBed.runInInjectionContext(() => guard(route, segments, {} as never));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authStub }] });
  });

  it('authGuard redirige al login conservando la URL de retorno', () => {
    authStub.isAuthenticated.mockReturnValue(false);
    const result = run(authGuard, {}, [new UrlSegment('productos', {})]) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fproductos');
  });

  it('authGuard permite el paso con sesión', () => {
    authStub.isAuthenticated.mockReturnValue(true);
    expect(run(authGuard)).toBe(true);
  });

  it('roleGuard deniega el acceso si el rol no coincide', () => {
    authStub.hasRole.mockReturnValue(false);
    const result = run(roleGuard, { data: { roles: ['admin'] } }) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/acceso-denegado');
  });

  it('roleGuard permite el acceso al rol autorizado', () => {
    authStub.hasRole.mockReturnValue(true);
    expect(run(roleGuard, { data: { roles: ['admin'] } })).toBe(true);
  });
});
