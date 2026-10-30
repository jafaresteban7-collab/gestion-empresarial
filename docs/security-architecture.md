# Arquitectura de seguridad y control de acceso

GestiónPro · Álvaro Esteban · DAM 2 · Desarrollo de Interfaces (0488)

GestiónPro protege cada vista en tres capas independientes: el **router** (guards funcionales `canMatch`) impide cargar lo que el usuario no puede ver, la **interfaz** (`*hasPermission` y signals computadas) oculta lo que no puede usar, y la **API** vuelve a verificar firma, caducidad y permiso del JWT en cada petición. Las tres consultan el mismo modelo RBAC de permisos `recurso:acción`.

## A. Fundamentación teórico-técnica

### A.1 Functional guards

Un guard funcional es una función pura que el router ejecuta durante la navegación, con acceso a `inject()`. Devuelve `true` (continuar), `false` (cancelar) o un `UrlTree` (redirigir), de forma síncrona, como `Promise` o como `Observable`.

| Tipo | Cuándo se ejecuta | Uso en GestiónPro |
| --- | --- | --- |
| `canMatch` | Al **emparejar** la URL con la configuración de rutas, antes de cargar el código perezoso | `authGuard`, `guestGuard`, `permissionGuard` |
| `canActivate` | Después de emparejar y **cargar** la ruta, antes de activar el componente | No se usa: `canMatch` lo cubre |
| `canDeactivate` | Al intentar **salir** de la vista activa | `unsavedChangesGuard` en el formulario de producto |

Orden en una navegación: `canMatch` → carga perezosa (`loadComponent`/`loadChildren`) → `canActivateChild`/`canActivate` → resolvers → activación. Al salir de una vista se evalúa antes su `canDeactivate`.

**`canActivate` frente a `canMatch` con lazy loading.** Con `canActivate`, el router ya ha descargado el chunk de la vista cuando el guard deniega: se gasta red y el código de administración llega al navegador de un usuario sin permisos. Con `canMatch`, si el guard devuelve `false` la ruta se trata como no emparejada y el chunk **no se descarga**. Además permite definir dos rutas con el mismo `path` para roles distintos.

### A.2 HTTP interceptors (`HttpInterceptorFn`)

Los interceptores forman una cadena: cada uno recibe la petición (`HttpRequest`, inmutable) y la función `next`, que pasa la petición al siguiente eslabón y devuelve un `Observable<HttpEvent>`. Al ser funciones, se registran en orden con `provideHttpClient(withInterceptors([...]))`. La petición recorre la lista de izquierda a derecha y la respuesta vuelve en sentido contrario, por eso un interceptor puede modificar la salida (`req.clone(...)`) y reaccionar a la respuesta con operadores RxJS (`catchError`, `switchMap`).

`authInterceptor` centraliza toda la gestión de la sesión:

1. Si la URL pertenece a la API y no es pública (`/auth/login`, `/auth/register`, `/auth/refresh`, `/users/exists`), clona la petición con `Authorization: Bearer <token de acceso>`.
2. **401 Unauthorized** (el token de acceso de 15 min ha caducado): llama a `AuthService.refreshSession()`, que canjea el token de refresco (8 h) por un par nuevo, y repite la petición original **una sola vez** con el token nuevo. Si varias peticiones fallan a la vez, todas esperan a la misma renovación (`shareReplay`). Si la renovación falla, se cierra la sesión (`logout('expired')`) y se propaga el 401.
3. **403 Forbidden** (autenticado pero sin permiso): navega a `/acceso-denegado` y propaga el error.

### A.3 Control de acceso basado en roles (RBAC)

RBAC (NIST, Sandhu et al.) define tres conjuntos: **usuarios**, **roles** y **permisos**. Un usuario se asigna a roles, un rol agrupa permisos, y el sistema autoriza una operación si alguno de los roles del usuario tiene el permiso. Con jerarquía de roles (RBAC1), un rol superior hereda los permisos de los inferiores. La diferencia con un flag `isAdmin` es que el código pregunta por **lo que se quiere hacer** (`productos:editar`) y no por **quién es** el usuario. Así, añadir un rol solo cambia la matriz y no el código.

| | Autenticación | Autorización |
| --- | --- | --- |
| Pregunta | ¿Quién eres? | ¿Qué puedes hacer? |
| Mecanismo | Correo + contraseña (hash SHA-256 con sal) → JWT firmado | Permisos del rol, en el claim `perms` y en la matriz del servidor |
| Fallo HTTP | 401 | 403 |
| En el cliente | `authGuard`, `isAuthenticated()` | `permissionGuard`, `can()`, `*hasPermission` |

Los claims del token de acceso son `{ sub, email, role, perms[], typ: 'access', iat, exp }`. `AuthService` es el único que los lee: expone `claims`, `permissions` (un `Set` derivado) y `can()`/`canAll()` como signals computadas. Guards, directiva y vistas dependen de ese servicio y nunca del token. El cliente decodifica el token sin verificarlo, solo para la UI. El servidor verifica la firma y calcula los permisos con **su propia matriz**, así que editar el token en el navegador no concede nada.

## B. Implementación en el proyecto

### B.1 Rutas, roles e interceptor

`src/app/app.routes.ts` y `pages/products/products.routes.ts`:

```ts
{ path: 'login',    canMatch: [guestGuard], loadComponent: … },
{ path: 'registro', canMatch: [guestGuard], loadComponent: … },
{
  path: '', canMatch: [authGuard], loadComponent: () => import('./layout/shell'),
  children: [
    { path: 'dashboard', canMatch: [permissionGuard], data: { permissions: ['dashboard:ver'] }, … },
    { path: 'usuarios',  canMatch: [permissionGuard], data: { permissions: ['usuarios:gestionar'] }, … },
    { path: 'productos', loadChildren: () => import('./pages/products/products.routes') },
    // inicio, actividad, ayuda, acceso-denegado: solo exigen sesión (authGuard del padre)
  ],
},
// products.routes.ts
{ path: 'nuevo',      canMatch: [permissionGuard], canDeactivate: [unsavedChangesGuard], data: { permissions: ['productos:editar'] }, … },
{ path: ':id/editar', canMatch: [permissionGuard], canDeactivate: [unsavedChangesGuard], data: { permissions: ['productos:editar'] }, … },
```

`authGuard` guarda la URL pedida en `?returnUrl=` y el login vuelve a ella tras autenticarse (redirección contextual).

Jerarquía de roles (`core/auth/permissions.ts`): **Administrador ⊃ Usuario estándar**.

| Permiso | Usuario estándar | Administrador | Pantallas y acciones |
| --- | --- | --- | --- |
| `productos:ver` | ✓ | ✓ | Listado de productos |
| `pedidos:ver` | ✓ | ✓ | Actividad en tiempo real |
| `informes:exportar` | ✓ | ✓ | Botones CSV y PDF |
| `productos:editar` | ✗ | ✓ | Nuevo/editar/eliminar producto |
| `dashboard:ver` | ✗ | ✓ | Cuadro de mando |
| `usuarios:gestionar` | ✗ | ✓ | Listado de usuarios |

El interceptor se registra una sola vez en `app.config.ts`, antes que el backend simulado, para que este reciba ya la cabecera:

```ts
provideHttpClient(withInterceptors([authInterceptor, mockBackendInterceptor]))
```

### B.2 Interfaz condicional

- **Menú lateral** (`layout/shell.ts`): cada entrada declara su permiso, y una signal computada filtra la lista: `menu = computed(() => MENU.filter(m => m.permission === null || auth.can(m.permission)))`.
- **Directiva estructural `*hasPermission`** (`shared/directives`): crea o destruye la vista dentro de un `effect()`, así reacciona sola si cambian los permisos de la sesión. Admite `else`:

```html
<ion-button *hasPermission="'productos:editar'" routerLink="/productos/nuevo">Nuevo producto</ion-button>
```

- **Acciones de tabla** (`product-list.page.ts`): `actions = computed(() => auth.can('productos:editar') ? [editar, eliminar] : [])`. El Usuario estándar ve el inventario sin botones de edición.

Ocultar es solo experiencia de usuario: si alguien fuerza la URL, actúa el guard; si fuerza la petición, responde la API con 403.

## C. Matriz de alternativas evaluadas

| Decisión | Alternativa | Seguridad | Red | Mantenibilidad | Escalabilidad |
| --- | --- | --- | --- | --- | --- |
| **Guards en el router** | Comprobar en `ngOnInit()` / `ionViewWillEnter()` | El componente llega a crearse y puede pintar o pedir datos antes de redirigir | Se descarga el chunk siempre | La comprobación se repite en cada página y es fácil olvidarla | Cada vista nueva debe acordarse de copiarla |
| | **Elegido: `canMatch` funcional** | Bloquea antes de crear nada | Sin descarga del chunk prohibido | Declarativo en `routes.ts`, probado aparte | Una línea por ruta |
| **Interceptor HTTP** | Añadir cabeceras en cada servicio | Una llamada sin cabecera o sin control de 401 pasa desapercibida | Cada servicio renovaría el token por su cuenta | Lógica duplicada en N servicios | Cada servicio nuevo hereda el riesgo |
| | **Elegido: `HttpInterceptorFn`** | Un único punto, probado | Una sola renovación compartida | Los servicios no saben nada de tokens | Automático para cualquier petición |
| **Modelo de acceso** | Flag `isAdmin` | Todo o nada; un tercer rol obliga a tocar todo el código | — | Condiciones `if (isAdmin)` dispersas | No escala más allá de 2 perfiles |
| | ABAC (atributos y contexto) | Muy fino (p. ej. por departamento u horario) | Evaluar políticas suele requerir más datos por petición | Motor de políticas y reglas a mantener | Alta, pero sobredimensionado para 2 roles |
| | **Elegido: RBAC por permisos** | El servidor decide con su matriz | Los permisos viajan en el JWT, sin consultas extra | Una matriz central; el código pregunta por permisos | Nuevo rol (p. ej. Supervisor) = una fila en la matriz |

**Limitaciones conocidas.** El backend es simulado en el navegador, así que su clave de firma no es secreta. En producción viviría en el servidor. El token de refresco se guarda en `sessionStorage`: en producción iría en una cookie `HttpOnly; Secure; SameSite=Strict` con rotación y lista de revocación, para que ningún script pueda leerlo.
