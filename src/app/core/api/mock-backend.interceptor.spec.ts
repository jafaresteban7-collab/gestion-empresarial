import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { LoginResponse } from '../models/user.model';
import { decodeJwt } from '../utils/jwt';
import { mockBackendInterceptor, resetMockDatabase } from './mock-backend.interceptor';
import { SqlDatabase } from './sql-database';

/** Pruebas de la API REST simulada: autenticación, autorización por rol y restricciones SQL. */
describe('mockBackendInterceptor', () => {
  let http: HttpClient;

  const login = (email: string, password: string) =>
    firstValueFrom(http.post<LoginResponse>('/api/auth/login', { email, password }));
  const status = async (p: Promise<unknown>) => {
    try {
      await p;
      return 200;
    } catch (e) {
      return (e as HttpErrorResponse).status;
    }
  };
  const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

  beforeEach(() => {
    resetMockDatabase(new SqlDatabase(undefined));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([mockBackendInterceptor]))],
    });
    http = TestBed.inject(HttpClient);
  });

  it('devuelve 401 con credenciales incorrectas', async () => {
    expect(await status(login('admin@empresa.test', 'incorrecta'))).toBe(401);
  });

  it('emite un JWT con el rol del usuario', async () => {
    const res = await login('admin@empresa.test', 'Admin2026!');
    expect(res.user.role).toBe('admin');
    expect(res.token.split('.')).toHaveLength(3);
    expect(res.user).not.toHaveProperty('passwordHash');
  });

  it('exige token para las rutas protegidas', async () => {
    expect(await status(firstValueFrom(http.get('/api/products')))).toBe(401);
  });

  it('impide a un usuario estándar crear productos (403)', async () => {
    const { token } = await login('usuario@empresa.test', 'Usuario2026!');
    const product = { sku: 'HW-999', name: 'Prueba', category: 'Hardware', stock: 1, price: 1, supplier: '' };
    expect(await status(firstValueFrom(http.get('/api/products', auth(token))))).toBe(200);
    expect(await status(firstValueFrom(http.post('/api/products', product, auth(token))))).toBe(403);
  });

  it('el administrador crea productos y se respeta la unicidad del SKU (409)', async () => {
    const { token } = await login('admin@empresa.test', 'Admin2026!');
    const product = { sku: 'hw-999', name: 'Prueba', category: 'Hardware', stock: 1, price: 1, supplier: '' };
    const created = await firstValueFrom(http.post<{ sku: string }>('/api/products', product, auth(token)));
    expect(created.sku).toBe('HW-999');
    expect(await status(firstValueFrom(http.post('/api/products', product, auth(token))))).toBe(409);
  });

  it('incluye los permisos del rol en el token de acceso', async () => {
    const { token } = await login('usuario@empresa.test', 'Usuario2026!');
    expect(decodeJwt(token)).toMatchObject({ typ: 'access', role: 'user', perms: ['productos:ver', 'pedidos:ver', 'informes:exportar'] });
  });

  it('solo el permiso usuarios:gestionar lista usuarios (403 para el usuario estándar)', async () => {
    const user = await login('usuario@empresa.test', 'Usuario2026!');
    const admin = await login('admin@empresa.test', 'Admin2026!');
    expect(await status(firstValueFrom(http.get('/api/users', auth(user.token))))).toBe(403);
    expect(await status(firstValueFrom(http.get('/api/users', auth(admin.token))))).toBe(200);
  });

  it('renueva la sesión con el token de refresco y rechaza usarlo como token de acceso', async () => {
    const { refreshToken } = await login('admin@empresa.test', 'Admin2026!');
    expect(await status(firstValueFrom(http.get('/api/products', auth(refreshToken))))).toBe(401);
    const renewed = await firstValueFrom(http.post<LoginResponse>('/api/auth/refresh', { refreshToken }));
    expect(decodeJwt(renewed.token)?.typ).toBe('access');
    expect(await status(firstValueFrom(http.get('/api/products', auth(renewed.token))))).toBe(200);
  });

  it('no renueva con un token de acceso ni con uno manipulado (401)', async () => {
    const { token } = await login('admin@empresa.test', 'Admin2026!');
    expect(await status(firstValueFrom(http.post('/api/auth/refresh', { refreshToken: token })))).toBe(401);
    expect(await status(firstValueFrom(http.post('/api/auth/refresh', { refreshToken: 'a.b.c' })))).toBe(401);
  });

  it('comprueba si un correo ya existe', async () => {
    const res = await firstValueFrom(
      http.get<{ exists: boolean }>('/api/users/exists', { params: { email: 'ADMIN@empresa.test' } }),
    );
    expect(res.exists).toBe(true);
  });
});
