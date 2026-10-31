import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { defer, delay, from, materialize, dematerialize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProductInput, CATEGORIES } from '../models/product.model';
import { Permission, permissionsFor } from '../auth/permissions';
import { LoginRequest, RegisterRequest, User, UserRecord } from '../models/user.model';
import { hashPassword, randomSalt } from '../utils/crypto';
import { JwtPayload, signJwt, verifyJwt } from '../utils/jwt';
import { ConstraintError, SqlDatabase } from './sql-database';

/** Duración del token de acceso (15 minutos): limita el daño si se filtra. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
/** Duración del token de refresco (8 horas, una jornada laboral). */
export const REFRESH_TOKEN_TTL_SECONDS = 8 * 60 * 60;

/**
 * Clave de firma del backend SIMULADO. No es un secreto real: en un backend
 * de producción esta clave viviría únicamente en el servidor.
 */
const MOCK_SIGNING_KEY = 'mock-backend-demo-key';

let db: SqlDatabase | undefined;
const database = (): SqlDatabase => (db ??= new SqlDatabase());

/** Reinicia la base de datos simulada (uso en pruebas unitarias). */
export function resetMockDatabase(instance?: SqlDatabase): void {
  db = instance;
}

/**
 * Interceptor que simula una API REST respaldada por una base de datos SQL.
 * Atiende las rutas `/api/**` con latencia de red, verificación de JWT y
 * autorización por rol, devolviendo códigos HTTP reales (200, 201, 204, 400,
 * 401, 403, 404, 409). Cualquier otra petición se delega al siguiente handler,
 * por lo que basta con retirarlo de `app.config.ts` para usar un backend real.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockBackend || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const path = req.url.slice(environment.apiUrl.length);
  return defer(() => from(route(req, path))).pipe(
    // materialize/dematerialize aplica el retardo también a los errores
    materialize(),
    delay(environment.mockLatencyMs),
    dematerialize(),
  );
};

async function route(req: HttpRequest<unknown>, path: string): Promise<HttpEvent<unknown>> {
  const method = req.method;

  if (method === 'POST' && path === '/auth/login') {
    return login(req.body as LoginRequest);
  }
  if (method === 'POST' && path === '/auth/refresh') {
    return refresh(req.body as { refreshToken?: string });
  }
  if (method === 'POST' && path === '/auth/register') {
    return register(req.body as RegisterRequest);
  }
  if (method === 'GET' && path === '/users/exists') {
    const email = req.params.get('email') ?? '';
    return ok({ exists: !!database().findUserByEmail(email) });
  }

  // A partir de aquí todas las rutas requieren autenticación
  const claims = await authenticate(req);

  if (method === 'GET' && path === '/auth/me') {
    const user = database().findUserById(Number(claims.sub));
    return user ? ok(toPublicUser(user)) : fail(404, 'Usuario no encontrado.');
  }
  if (method === 'GET' && path === '/users') {
    requirePermission(claims, 'usuarios:gestionar');
    return ok(database().listUsers().map(toPublicUser));
  }
  if (method === 'GET' && path === '/products') {
    return ok(database().listProducts());
  }
  if (method === 'GET' && path === '/products/sku-exists') {
    const sku = req.params.get('sku') ?? '';
    const exclude = req.params.has('excludeId') ? Number(req.params.get('excludeId')) : undefined;
    return ok({ exists: database().skuExists(sku, exclude) });
  }

  const productMatch = /^\/products\/(\d+)$/.exec(path);
  if (method === 'GET' && productMatch) {
    const product = database().findProduct(Number(productMatch[1]));
    return product ? ok(product) : fail(404, 'Producto no encontrado.');
  }
  if (method === 'POST' && path === '/products') {
    requirePermission(claims, 'productos:editar');
    const input = validateProduct(req.body);
    return withConstraints(() => new HttpResponse({ status: 201, body: database().insertProduct(input) }));
  }
  if (method === 'PUT' && productMatch) {
    requirePermission(claims, 'productos:editar');
    const input = validateProduct(req.body);
    return withConstraints(() => {
      const updated = database().updateProduct(Number(productMatch[1]), input);
      return updated ? ok(updated) : fail(404, 'Producto no encontrado.');
    });
  }
  if (method === 'DELETE' && productMatch) {
    requirePermission(claims, 'productos:editar');
    return database().deleteProduct(Number(productMatch[1]))
      ? new HttpResponse({ status: 204 })
      : fail(404, 'Producto no encontrado.');
  }

  return fail(404, `Ruta no encontrada: ${method} ${path}`);
}

async function login(body: LoginRequest): Promise<HttpResponse<unknown>> {
  const user = body?.email ? database().findUserByEmail(body.email) : undefined;
  // Se calcula el hash aunque el usuario no exista para no revelar qué correos existen por tiempo de respuesta
  const hash = await hashPassword(user?.salt ?? 'no-user', body?.password ?? '');
  if (!user || hash !== user.passwordHash) {
    throw httpError(401, 'Correo o contraseña incorrectos.');
  }
  return ok(await issueTokens(user));
}

/**
 * Canjea un token de refresco válido por un par nuevo (rotación).
 * El rol se vuelve a leer de la base de datos, así un cambio de permisos
 * se aplica en el siguiente refresco sin esperar a un nuevo login.
 */
async function refresh(body: { refreshToken?: string }): Promise<HttpResponse<unknown>> {
  const claims = body?.refreshToken ? await verifyJwt(body.refreshToken, MOCK_SIGNING_KEY) : null;
  const user = claims?.typ === 'refresh' ? database().findUserById(Number(claims.sub)) : undefined;
  if (!user) {
    throw httpError(401, 'La sesión ha caducado. Inicie sesión de nuevo.');
  }
  return ok(await issueTokens(user));
}

/** Emite el token de acceso (con rol y permisos) y el de refresco. */
async function issueTokens(user: UserRecord): Promise<{ token: string; refreshToken: string; user: User }> {
  const now = Math.floor(Date.now() / 1000);
  const base = { sub: user.id, email: user.email, role: user.role, iat: now };
  const token = await signJwt(
    { ...base, typ: 'access', perms: [...permissionsFor(user.role)], exp: now + ACCESS_TOKEN_TTL_SECONDS },
    MOCK_SIGNING_KEY,
  );
  const refreshToken = await signJwt({ ...base, typ: 'refresh', exp: now + REFRESH_TOKEN_TTL_SECONDS }, MOCK_SIGNING_KEY);
  return { token, refreshToken, user: toPublicUser(user) };
}

async function register(body: RegisterRequest): Promise<HttpResponse<unknown>> {
  if (!body?.name?.trim() || !body.email?.includes('@') || !body.password || body.password.length < 8) {
    throw httpError(400, 'Datos de registro no válidos.');
  }
  const salt = randomSalt();
  const passwordHash = await hashPassword(salt, body.password);
  return withConstraints(() => {
    const record = database().insertUser({
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      department: body.department,
      role: 'user', // el alta pública siempre crea usuarios estándar
      salt,
      passwordHash,
    });
    return new HttpResponse({ status: 201, body: toPublicUser(record) });
  });
}

async function authenticate(req: HttpRequest<unknown>): Promise<JwtPayload> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const claims = token ? await verifyJwt(token, MOCK_SIGNING_KEY) : null;
  // Un token de refresco no sirve como credencial de acceso
  if (!claims || claims.typ === 'refresh') {
    throw httpError(401, 'Sesión no válida o caducada.');
  }
  return claims;
}

/**
 * Autorización en el servidor: el permiso se deduce del rol con la matriz RBAC
 * del propio servidor, no del claim `perms`, que es solo informativo para la UI.
 */
function requirePermission(claims: JwtPayload, permission: Permission): void {
  if (!permissionsFor(claims.role).includes(permission)) {
    throw httpError(403, 'No tiene permisos para realizar esta acción.');
  }
}

function validateProduct(body: unknown): ProductInput {
  const p = body as Partial<ProductInput>;
  const valid =
    !!p?.sku?.trim() &&
    !!p.name?.trim() &&
    CATEGORIES.includes(p.category as never) &&
    Number.isInteger(p.stock) &&
    (p.stock ?? -1) >= 0 &&
    typeof p.price === 'number' &&
    p.price >= 0;
  if (!valid) {
    throw httpError(400, 'Datos de producto no válidos.');
  }
  return {
    sku: p.sku!.trim().toUpperCase(),
    name: p.name!.trim(),
    category: p.category!,
    stock: p.stock!,
    price: p.price!,
    supplier: p.supplier?.trim() ?? '',
  };
}

function withConstraints(fn: () => HttpResponse<unknown>): HttpResponse<unknown> {
  try {
    return fn();
  } catch (e) {
    if (e instanceof ConstraintError) {
      throw httpError(409, e.message);
    }
    throw e;
  }
}

function toPublicUser({ salt: _s, passwordHash: _h, ...user }: UserRecord): User {
  return user;
}

function ok(body: unknown): HttpResponse<unknown> {
  return new HttpResponse({ status: 200, body });
}

function fail(status: number, message: string): never {
  throw httpError(status, message);
}

function httpError(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, statusText: message, error: { message } });
}
