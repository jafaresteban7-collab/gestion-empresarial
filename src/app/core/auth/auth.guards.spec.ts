import { TestBed } from '@angular/core/testing';
import { Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { NotificationService } from '../services/notification.service';
import { AuthService } from './auth.service';
import { HasUnsavedChanges, authGuard, permissionGuard, unsavedChangesGuard } from './auth.guards';

describe('guards de rutas', () => {
  const authStub = { isAuthenticated: vi.fn(), canAll: vi.fn() };
  const notifyStub = { confirm: vi.fn() };
  const run = (guard: typeof authGuard, route: Route = {}, segments: UrlSegment[] = []) =>
    TestBed.runInInjectionContext(() => guard(route, segments, {} as never));
  const leave = (component: HasUnsavedChanges) =>
    TestBed.runInInjectionContext(() => unsavedChangesGuard(component, {} as never, {} as never, {} as never));

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: NotificationService, useValue: notifyStub },
      ],
    });
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

  it('permissionGuard deniega el acceso sin el permiso de la ruta', () => {
    authStub.canAll.mockReturnValue(false);
    const result = run(permissionGuard, { data: { permissions: ['dashboard:ver'] } }) as UrlTree;
    expect(authStub.canAll).toHaveBeenCalledWith(['dashboard:ver']);
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/acceso-denegado');
  });

  it('permissionGuard permite el acceso con el permiso', () => {
    authStub.canAll.mockReturnValue(true);
    expect(run(permissionGuard, { data: { permissions: ['dashboard:ver'] } })).toBe(true);
  });

  it('unsavedChangesGuard deja salir sin preguntar si no hay cambios', () => {
    expect(leave({ hasUnsavedChanges: () => false })).toBe(true);
    expect(notifyStub.confirm).not.toHaveBeenCalled();
  });

  it('unsavedChangesGuard pide confirmación si hay cambios sin guardar', async () => {
    notifyStub.confirm.mockResolvedValue(false);
    expect(await leave({ hasUnsavedChanges: () => true })).toBe(false);
    expect(notifyStub.confirm).toHaveBeenCalledOnce();
  });
});
