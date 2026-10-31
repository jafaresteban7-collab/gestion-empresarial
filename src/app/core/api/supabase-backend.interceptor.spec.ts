import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LoginResponse } from '../models/user.model';
import { Product } from '../models/product.model';
import { SUPABASE_CONFIG, supabaseBackendInterceptor } from './supabase-backend.interceptor';

/** Pruebas del adaptador a Supabase: traducción de rutas, cabeceras, datos y errores. */
describe('supabaseBackendInterceptor', () => {
  const URL = 'https://demo.supabase.co';
  let http: HttpClient;
  let backend: HttpTestingController;

  const row = { id: 7, sku: 'HW-007', name: 'Webcam HD', category: 'Hardware', stock: 4, price: '39.90', supplier: null, updated_at: '2026-10-31T10:00:00Z' };
  const profile = { id: 'uuid-1', name: 'Ana Admin', email: 'admin@empresa.test', department: 'Dirección', role: 'admin', created_at: '2026-10-31T09:00:00Z' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([supabaseBackendInterceptor])),
        provideHttpClientTesting(),
        { provide: SUPABASE_CONFIG, useValue: { url: URL, key: 'anon-key' } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('lee productos de la API REST de PostgreSQL con la clave pública y el JWT del usuario', () => {
    let products: Product[] = [];
    http.get<Product[]>('/api/products', { headers: { Authorization: 'Bearer jwt' } }).subscribe((p) => (products = p));
    const req = backend.expectOne((r) => r.url === `${URL}/rest/v1/products`);
    expect(req.request.params.get('order')).toBe('sku.asc');
    expect(req.request.headers.get('apikey')).toBe('anon-key');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt');
    req.flush([row]);
    expect(products).toEqual([
      { id: 7, sku: 'HW-007', name: 'Webcam HD', category: 'Hardware', stock: 4, price: 39.9, supplier: '', updatedAt: '2026-10-31T10:00:00Z' },
    ]);
  });

  it('inicia sesión con Supabase Auth y completa la sesión con el perfil y su rol', () => {
    let response: LoginResponse | undefined;
    http.post<LoginResponse>('/api/auth/login', { email: 'admin@empresa.test', password: 'x' }).subscribe((r) => (response = r));
    const token = backend.expectOne(`${URL}/auth/v1/token?grant_type=password`);
    expect(token.request.body).toEqual({ email: 'admin@empresa.test', password: 'x' });
    token.flush({ access_token: 'acc', refresh_token: 'ref', user: { id: 'uuid-1' } });
    const prof = backend.expectOne((r) => r.url === `${URL}/rest/v1/profiles`);
    expect(prof.request.params.get('id')).toBe('eq.uuid-1');
    expect(prof.request.headers.get('Authorization')).toBe('Bearer acc');
    prof.flush(profile);
    expect(response).toEqual({
      token: 'acc',
      refreshToken: 'ref',
      user: { id: 'uuid-1', name: 'Ana Admin', email: 'admin@empresa.test', role: 'admin', department: 'Dirección', createdAt: '2026-10-31T09:00:00Z' },
    });
  });

  it('convierte credenciales incorrectas en un 401 con mensaje en español', () => {
    let error: HttpErrorResponse | undefined;
    http.post('/api/auth/login', { email: 'a@b.test', password: 'mala' }).subscribe({ error: (e) => (error = e) });
    backend
      .expectOne(`${URL}/auth/v1/token?grant_type=password`)
      .flush({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, { status: 400, statusText: 'Bad Request' });
    expect(error?.status).toBe(401);
    expect(error?.error.message).toBe('Correo o contraseña incorrectos.');
  });

  it('traduce un SKU duplicado (23505) a 409 y la denegación de RLS (42501) a 403', () => {
    const input = { sku: 'hw-007', name: 'Webcam HD', category: 'Hardware', stock: 4, price: 39.9, supplier: '' };
    const statuses: number[] = [];
    http.post('/api/products', input).subscribe({ error: (e: HttpErrorResponse) => statuses.push(e.status) });
    const insert = backend.expectOne(`${URL}/rest/v1/products`);
    expect(insert.request.body).toMatchObject({ sku: 'HW-007' });
    expect(insert.request.headers.get('Prefer')).toBe('return=representation');
    insert.flush({ code: '23505', message: 'duplicate key' }, { status: 409, statusText: 'Conflict' });

    http.post('/api/products', input).subscribe({ error: (e: HttpErrorResponse) => statuses.push(e.status) });
    backend.expectOne(`${URL}/rest/v1/products`).flush({ code: '42501', message: 'violates row-level security policy' }, { status: 403, statusText: 'Forbidden' });
    expect(statuses).toEqual([409, 403]);
  });

  it('comprueba si un correo existe con la función email_exists', () => {
    let exists: boolean | undefined;
    http.get<{ exists: boolean }>('/api/users/exists', { params: { email: 'admin@empresa.test' } }).subscribe((r) => (exists = r.exists));
    const rpc = backend.expectOne(`${URL}/rest/v1/rpc/email_exists`);
    expect(rpc.request.body).toEqual({ p_email: 'admin@empresa.test' });
    rpc.flush(true);
    expect(exists).toBe(true);
  });

  it('un borrado que no afecta a ninguna fila (no existe o RLS lo impide) da 404', () => {
    let error: HttpErrorResponse | undefined;
    http.delete('/api/products/99').subscribe({ error: (e) => (error = e) });
    const del = backend.expectOne((r) => r.url === `${URL}/rest/v1/products` && r.method === 'DELETE');
    expect(del.request.params.get('id')).toBe('eq.99');
    del.flush([]);
    expect(error?.status).toBe(404);
  });
});
