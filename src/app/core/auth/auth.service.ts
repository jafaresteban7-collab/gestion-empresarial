import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { NavController } from '@ionic/angular/nav-controller';
import { Observable, finalize, map, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest, Role, Session, User } from '../models/user.model';
import { JwtPayload, decodeJwt } from '../utils/jwt';
import { readJson, removeKey, session as sessionStorageRef, writeJson } from '../utils/storage';
import { Permission, permissionsFor } from './permissions';

const SESSION_KEY = 'ge.session';
/** Duración de la sesión cuando el token de refresco no lleva caducidad (Supabase): 8 h. */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * Almacén (store) de autenticación basado en Signals.
 *
 * El estado de sesión solo se modifica a través de los métodos públicos
 * (`login`, `refreshSession`, `logout`), lo que hace que la gestión del estado
 * sea predecible: los componentes leen señales de solo lectura derivadas
 * (`user`, `permissions`…) y preguntan con `can(permiso)`, nunca por el rol.
 *
 * Autenticación (quién es) y autorización (qué puede hacer) quedan separadas:
 * la identidad sale de `user` y los privilegios, de los claims del JWT.
 * La sesión se guarda en `sessionStorage` y termina cuando caduca el token
 * de refresco; el de acceso (15 min) se renueva sin que el usuario lo note.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly nav = inject(NavController);
  private readonly api = environment.apiUrl;

  private readonly state = signal<Session | null>(null);
  private expiryTimer?: ReturnType<typeof setTimeout>;
  /** Renovación en curso, compartida por todas las peticiones que reciban 401 a la vez. */
  private refreshInFlight$: Observable<string> | null = null;

  /** Sesión actual (solo lectura). */
  readonly session = this.state.asReadonly();
  /** Usuario autenticado o `null`. */
  readonly user = computed<User | null>(() => this.state()?.user ?? null);
  /** `true` si hay una sesión válida. */
  readonly isAuthenticated = computed(() => this.state() !== null);
  /** Rol del usuario actual. */
  readonly role = computed<Role | null>(() => this.state()?.user.role ?? null);
  /** Claims del token de acceso actual (decodificados, no verificados: eso lo hace el servidor). */
  readonly claims = computed<JwtPayload | null>(() => {
    const token = this.state()?.token;
    return token ? decodeJwt(token) : null;
  });
  /**
   * Permisos efectivos del usuario: los del claim `perms` si el servidor los firma
   * en el token (backend simulado) o, si no, los del rol de su perfil (Supabase).
   * En ambos casos el servidor vuelve a comprobarlos en cada petición.
   */
  readonly permissions = computed<ReadonlySet<Permission>>(() => {
    const role = this.role();
    return new Set(this.claims()?.perms ?? (role ? permissionsFor(role) : []));
  });

  constructor() {
    const stored = readJson<Session>(sessionStorageRef(), SESSION_KEY);
    if (stored?.refreshToken && stored.refreshExpiresAt > Date.now()) {
      this.setSession(stored);
    } else {
      removeKey(sessionStorageRef(), SESSION_KEY);
    }
  }

  /** Token JWT actual, usado por el interceptor HTTP. */
  get token(): string | null {
    return this.state()?.token ?? null;
  }

  /** Inicia sesión contra la API y guarda el token recibido. */
  login(credentials: LoginRequest): Observable<User> {
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, credentials).pipe(
      map((response) => this.applyTokens(response).user),
    );
  }

  /**
   * Obtiene un token de acceso nuevo con el de refresco (lo llama el interceptor ante un 401).
   * Si varias peticiones fallan a la vez, todas esperan a la misma renovación.
   * @returns Observable con el nuevo token de acceso.
   */
  refreshSession(): Observable<string> {
    const refreshToken = this.state()?.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No hay sesión que renovar.'));
    }
    this.refreshInFlight$ ??= this.http.post<LoginResponse>(`${this.api}/auth/refresh`, { refreshToken }).pipe(
      map((response) => this.applyTokens(response).token),
      finalize(() => (this.refreshInFlight$ = null)),
      shareReplay(1),
    );
    return this.refreshInFlight$;
  }

  /** Da de alta un nuevo usuario estándar. */
  register(data: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${this.api}/auth/register`, data);
  }

  /** Comprueba de forma asíncrona si un correo ya está registrado. */
  emailExists(email: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${this.api}/users/exists`, { params: { email } })
      .pipe(map((r) => r.exists));
  }

  /** Lista de usuarios (solo Administrador). */
  listUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.api}/users`);
  }

  /** Comprueba si el usuario actual tiene el permiso indicado. */
  can(permission: Permission): boolean {
    return this.permissions().has(permission);
  }

  /** Comprueba si el usuario actual tiene todos los permisos indicados. */
  canAll(permissions: readonly Permission[]): boolean {
    return permissions.every((p) => this.can(p));
  }

  /**
   * Cierra la sesión y redirige al login.
   * @param reason Motivo opcional que se muestra en la pantalla de login.
   */
  logout(reason?: 'expired'): void {
    clearTimeout(this.expiryTimer);
    this.refreshInFlight$ = null;
    this.state.set(null);
    removeKey(sessionStorageRef(), SESSION_KEY);
    // navigateRoot vacía la pila de Ionic: se destruyen las vistas privadas cacheadas
    void this.nav.navigateRoot(['/login'], reason ? { queryParams: { motivo: reason } } : {});
  }

  /** Valida los tokens recibidos del servidor y los guarda como sesión activa. */
  private applyTokens({ token, refreshToken, user }: LoginResponse): Session {
    const access = decodeJwt(token);
    if (!access || !refreshToken) {
      throw new Error('Token recibido no válido.');
    }
    // El token de refresco de Supabase es opaco (no es un JWT): la sesión dura SESSION_TTL_MS
    const refresh = decodeJwt(refreshToken);
    const session: Session = {
      token,
      refreshToken,
      user,
      expiresAt: access.exp * 1000,
      refreshExpiresAt: refresh ? refresh.exp * 1000 : Date.now() + SESSION_TTL_MS,
    };
    this.setSession(session);
    return session;
  }

  private setSession(session: Session): void {
    this.state.set(session);
    writeJson(sessionStorageRef(), SESSION_KEY, session);
    clearTimeout(this.expiryTimer);
    // La sesión termina cuando ya no se puede renovar
    this.expiryTimer = setTimeout(() => this.logout('expired'), Math.max(0, session.refreshExpiresAt - Date.now()));
  }
}
