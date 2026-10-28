import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { NavController } from '@ionic/angular/nav-controller';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest, Role, Session, User } from '../models/user.model';
import { decodeJwt } from '../utils/jwt';
import { readJson, removeKey, session as sessionStorageRef, writeJson } from '../utils/storage';

const SESSION_KEY = 'ge.session';

/**
 * Almacén (store) de autenticación basado en Signals.
 *
 * El estado de sesión solo se modifica a través de los métodos públicos
 * (`login`, `logout`), lo que hace que la gestión del estado sea predecible:
 * los componentes leen señales de solo lectura derivadas (`user`, `isAdmin`…).
 * La sesión se guarda en `sessionStorage` y caduca automáticamente
 * cuando expira el JWT.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly nav = inject(NavController);
  private readonly api = environment.apiUrl;

  private readonly state = signal<Session | null>(null);
  private expiryTimer?: ReturnType<typeof setTimeout>;

  /** Sesión actual (solo lectura). */
  readonly session = this.state.asReadonly();
  /** Usuario autenticado o `null`. */
  readonly user = computed<User | null>(() => this.state()?.user ?? null);
  /** `true` si hay una sesión válida. */
  readonly isAuthenticated = computed(() => this.state() !== null);
  /** Rol del usuario actual. */
  readonly role = computed<Role | null>(() => this.state()?.user.role ?? null);
  /** `true` si el usuario es Administrador. */
  readonly isAdmin = computed(() => this.role() === 'admin');

  constructor() {
    const stored = readJson<Session>(sessionStorageRef(), SESSION_KEY);
    if (stored && stored.expiresAt > Date.now()) {
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
      map(({ token, user }) => {
        const claims = decodeJwt(token);
        if (!claims) {
          throw new Error('Token recibido no válido.');
        }
        this.setSession({ token, user, expiresAt: claims.exp * 1000 });
        return user;
      }),
    );
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

  /** Comprueba si el usuario actual tiene alguno de los roles indicados. */
  hasRole(roles: readonly Role[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  /**
   * Cierra la sesión y redirige al login.
   * @param reason Motivo opcional que se muestra en la pantalla de login.
   */
  logout(reason?: 'expired'): void {
    clearTimeout(this.expiryTimer);
    this.state.set(null);
    removeKey(sessionStorageRef(), SESSION_KEY);
    // navigateRoot vacía la pila de Ionic: se destruyen las vistas privadas cacheadas
    void this.nav.navigateRoot(['/login'], reason ? { queryParams: { motivo: reason } } : {});
  }

  private setSession(session: Session): void {
    this.state.set(session);
    writeJson(sessionStorageRef(), SESSION_KEY, session);
    clearTimeout(this.expiryTimer);
    this.expiryTimer = setTimeout(() => this.logout('expired'), Math.max(0, session.expiresAt - Date.now()));
  }
}
