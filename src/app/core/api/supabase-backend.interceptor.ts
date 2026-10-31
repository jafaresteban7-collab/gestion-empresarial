import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpHeaders,
  HttpInterceptorFn,
  HttpParams,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { Observable, catchError, filter, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProductInput } from '../models/product.model';
import { LoginRequest, LoginResponse, RegisterRequest, Role, User } from '../models/user.model';

/** Proyecto de Supabase al que se conecta la app. */
export interface SupabaseConfig {
  url: string;
  key: string;
}

/** Configuración de Supabase; se expone como token para poder sustituirla en las pruebas. */
export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig>('SUPABASE_CONFIG', {
  providedIn: 'root',
  factory: () => environment.supabase,
});

/** Fila de `public.products` tal como la devuelve PostgREST. */
interface ProductRow {
  id: number;
  sku: string;
  name: string;
  category: string;
  stock: number;
  price: number | string;
  supplier: string | null;
  updated_at: string;
}

/** Fila de `public.profiles`. */
interface ProfileRow {
  id: string;
  name: string;
  email: string;
  department: string;
  role: Role;
  created_at: string;
}

/** Sesión devuelta por Supabase Auth (GoTrue). */
interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: { id: string };
}

/** Cabecera con la que PostgREST devuelve un objeto en lugar de un array. */
const SINGLE = 'application/vnd.pgrst.object+json';

/**
 * Backend real: traduce la API REST de la app (`/api/...`) a Supabase.
 * - Datos: API REST de PostgreSQL generada por PostgREST (`/rest/v1`).
 * - Sesión: Supabase Auth (`/auth/v1`), que emite JWT de acceso y tokens de refresco.
 *
 * Las pantallas y los servicios no cambian: siguen llamando a `/api/products`,
 * `/api/auth/login`, etc. La autorización la aplica la base de datos con Row
 * Level Security, y los errores de Supabase se convierten en los códigos HTTP
 * que ya gestiona la app (401, 403, 404, 409).
 */
export const supabaseBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const api = new SupabaseApi(inject(SUPABASE_CONFIG), next, req.headers.get('Authorization'));
  const path = req.url.slice(environment.apiUrl.length);
  return route(api, req, path).pipe(catchError((error: unknown) => throwError(() => toAppError(error, path))));
};

function route(api: SupabaseApi, req: HttpRequest<unknown>, path: string): Observable<HttpEvent<unknown>> {
  const method = req.method;
  const productId = /^\/products\/(\d+)$/.exec(path)?.[1];

  if (method === 'POST' && path === '/auth/login') {
    const { email, password } = req.body as LoginRequest;
    return api.signIn('password', { email, password });
  }
  if (method === 'POST' && path === '/auth/refresh') {
    const { refreshToken } = req.body as { refreshToken: string };
    return api.signIn('refresh_token', { refresh_token: refreshToken });
  }
  if (method === 'POST' && path === '/auth/register') {
    const { email, password, name, department } = req.body as RegisterRequest;
    return api
      .auth<{ id?: string; user?: { id: string }; created_at?: string }>('signup', { email, password, data: { name, department } })
      .pipe(
        map((r) => {
          const user: User = {
            id: r.user?.id ?? r.id ?? '',
            name,
            email: email.toLowerCase(),
            role: 'user',
            department,
            createdAt: r.created_at ?? new Date().toISOString(),
          };
          return new HttpResponse({ status: 201, body: user });
        }),
      );
  }
  if (method === 'GET' && path === '/users/exists') {
    const email = req.params.get('email') ?? '';
    return api.rest<boolean>('POST', 'rpc/email_exists', { body: { p_email: email } }).pipe(map((exists) => ok({ exists })));
  }
  if (method === 'GET' && path === '/users') {
    return api
      .rest<ProfileRow[]>('GET', 'profiles', { params: { select: '*', order: 'created_at.asc' } })
      .pipe(map((rows) => ok(rows.map(toUser))));
  }
  if (method === 'GET' && path === '/products') {
    return api
      .rest<ProductRow[]>('GET', 'products', { params: { select: '*', order: 'sku.asc' } })
      .pipe(map((rows) => ok(rows.map(toProduct))));
  }
  if (method === 'GET' && path === '/products/sku-exists') {
    const params: Record<string, string> = { select: 'id', sku: `eq.${(req.params.get('sku') ?? '').trim().toUpperCase()}` };
    if (req.params.has('excludeId')) {
      params['id'] = `neq.${req.params.get('excludeId')}`;
    }
    return api.rest<unknown[]>('GET', 'products', { params }).pipe(map((rows) => ok({ exists: rows.length > 0 })));
  }
  if (method === 'GET' && productId) {
    return api
      .rest<ProductRow>('GET', 'products', { params: { select: '*', id: `eq.${productId}` }, single: true })
      .pipe(map((row) => ok(toProduct(row))));
  }
  if (method === 'POST' && path === '/products') {
    return api
      .rest<ProductRow>('POST', 'products', { body: toRow(req.body as ProductInput), single: true })
      .pipe(map((row) => new HttpResponse({ status: 201, body: toProduct(row) })));
  }
  if (method === 'PUT' && productId) {
    return api
      .rest<ProductRow>('PATCH', 'products', { params: { id: `eq.${productId}` }, body: toRow(req.body as ProductInput), single: true })
      .pipe(map((row) => ok(toProduct(row))));
  }
  if (method === 'DELETE' && productId) {
    return api.rest<ProductRow[]>('DELETE', 'products', { params: { id: `eq.${productId}` } }).pipe(
      map((rows) => {
        if (rows.length === 0) {
          throw appError(404, 'Producto no encontrado.');
        }
        return new HttpResponse({ status: 204 });
      }),
    );
  }
  return throwError(() => appError(404, `Ruta no encontrada: ${method} ${path}`));
}

/** Peticiones HTTP a Supabase a través del resto de la cadena de interceptores. */
class SupabaseApi {
  constructor(
    private readonly config: SupabaseConfig,
    private readonly next: HttpHandlerFn,
    /** Cabecera `Authorization: Bearer <JWT de Supabase>` que añadió `authInterceptor`. */
    private readonly authorization: string | null,
  ) {}

  /** Inicia o renueva la sesión y la completa con el perfil (nombre y rol) del usuario. */
  signIn(grant: 'password' | 'refresh_token', body: object): Observable<HttpResponse<LoginResponse>> {
    return this.auth<AuthSession>(`token?grant_type=${grant}`, body).pipe(
      switchMap((session) =>
        this.rest<ProfileRow>('GET', 'profiles', {
          params: { select: '*', id: `eq.${session.user.id}` },
          single: true,
          token: session.access_token,
        }).pipe(
          map((profile) =>
            ok({ token: session.access_token, refreshToken: session.refresh_token, user: toUser(profile) }),
          ),
        ),
      ),
    );
  }

  /** `POST /auth/v1/<path>` (Supabase Auth). */
  auth<T>(path: string, body: object): Observable<T> {
    return this.send<T>(new HttpRequest('POST', `${this.config.url}/auth/v1/${path}`, body, { headers: this.headers() }));
  }

  /** Petición a la API REST de PostgreSQL (`/rest/v1/<recurso>`). */
  rest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    resource: string,
    options: { params?: Record<string, string>; body?: object; single?: boolean; token?: string } = {},
  ): Observable<T> {
    let headers = this.headers(options.token ? `Bearer ${options.token}` : this.authorization);
    if (options.single) {
      headers = headers.set('Accept', SINGLE);
    }
    if (method !== 'GET' && !resource.startsWith('rpc/')) {
      headers = headers.set('Prefer', 'return=representation');
    }
    const url = `${this.config.url}/rest/v1/${resource}`;
    const init = { headers, params: new HttpParams({ fromObject: options.params ?? {} }) };
    const request =
      method === 'GET' || method === 'DELETE'
        ? new HttpRequest(method, url, init)
        : new HttpRequest(method, url, options.body ?? null, init);
    return this.send<T>(request);
  }

  private headers(authorization: string | null = null): HttpHeaders {
    const headers = new HttpHeaders({ apikey: this.config.key });
    return authorization ? headers.set('Authorization', authorization) : headers;
  }

  private send<T>(request: HttpRequest<unknown>): Observable<T> {
    return this.next(request).pipe(
      filter((event): event is HttpResponse<T> => event instanceof HttpResponse),
      map((response) => response.body as T),
    );
  }
}

function toProduct(row: ProductRow) {
  return {
    id: Number(row.id),
    sku: row.sku,
    name: row.name,
    category: row.category,
    stock: row.stock,
    price: Number(row.price),
    supplier: row.supplier ?? '',
    updatedAt: row.updated_at,
  };
}

function toRow(input: ProductInput) {
  return {
    sku: input.sku.trim().toUpperCase(),
    name: input.name.trim(),
    category: input.category,
    stock: input.stock,
    price: input.price,
    supplier: input.supplier?.trim() ?? '',
  };
}

function toUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    createdAt: row.created_at,
  };
}

function ok<T>(body: T): HttpResponse<T> {
  return new HttpResponse({ status: 200, body });
}

function appError(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, statusText: message, error: { message } });
}

/**
 * Traduce los errores de Supabase Auth (GoTrue) y de PostgREST/PostgreSQL a
 * los códigos y mensajes en español que ya maneja la app.
 */
function toAppError(error: unknown, path: string): unknown {
  if (!(error instanceof HttpErrorResponse) || error.status === 0) {
    return error;
  }
  const body = (error.error ?? {}) as { code?: string; error_code?: string; message?: string; msg?: string };
  const code = body.error_code ?? body.code ?? '';

  if (path === '/auth/login' && (error.status === 400 || code === 'invalid_credentials')) {
    return appError(401, 'Correo o contraseña incorrectos.');
  }
  if (path === '/auth/refresh') {
    return appError(401, 'La sesión ha caducado. Inicie sesión de nuevo.');
  }
  if (code === 'user_already_exists' || code === 'email_exists') {
    return appError(409, 'Ya existe una cuenta con ese correo.');
  }
  if (code === 'weak_password' || code === 'validation_failed') {
    return appError(400, 'Datos de registro no válidos.');
  }
  switch (code) {
    case '23505':
      return appError(409, 'Ya existe un producto con ese SKU.');
    case '23502':
    case '23514':
    case '22P02':
      return appError(400, 'Datos de producto no válidos.');
    case '42501':
      return appError(403, 'No tiene permisos para realizar esta acción.');
    case 'PGRST116':
      return appError(404, 'Producto no encontrado.');
    case 'PGRST301':
    case 'PGRST303':
      return appError(401, 'Sesión no válida o caducada.');
  }
  if (error.status === 401) {
    return appError(401, 'Sesión no válida o caducada.');
  }
  return appError(error.status, body.message ?? body.msg ?? error.message);
}
