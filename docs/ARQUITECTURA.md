# Arquitectura técnica · GestiónPro

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Angular 22 (componentes standalone, Signals, control flow `@if/@for`) |
| UI híbrida | Ionic 9 (`@ionic/angular`, componentes standalone) |
| Estado | Stores basados en Signals (`AuthService`, `InventoryStore`) |
| Asincronía | RxJS (Observables, `forkJoin`, `switchMap`, `retry`) y `async/await` |
| Gráficos | Chart.js 4 (registro selectivo de módulos) |
| Informes | jsPDF + jspdf-autotable (carga diferida), CSV propio |
| PWA | `@angular/service-worker` + Web App Manifest |
| Pruebas | Vitest (builder `@angular/build:unit-test`) |
| Documentación | Compodoc |
| CI/CD | GitHub Actions + Vercel |

## Patrón arquitectónico (MVVM)

```
src/app
├── core/                    ← Modelo + lógica de negocio (sin vistas)
│   ├── models/              ← Interfaces y tipos del dominio
│   ├── api/                 ← API REST simulada (SQL) + datos sintéticos
│   ├── auth/                ← AuthService (store), guards, interceptor JWT
│   ├── services/            ← Productos (REST), tiempo real (NoSQL), exportación, avisos
│   ├── store/               ← InventoryStore: estado global consolidado
│   ├── validators/          ← Validadores síncronos y asíncronos
│   └── utils/               ← JWT, criptografía, almacenamiento, errores
├── shared/
│   ├── components/          ← Componentes visuales reutilizables y agnósticos
│   │   ├── data-table/      ← Tabla con búsqueda, orden, paginación y acciones
│   │   ├── stat-widget/     ← Indicador KPI (conmutable)
│   │   ├── chart-card/      ← Gráfico Chart.js accesible
│   │   └── load-state/      ← Estado de carga / error / reintento
│   └── models/              ← TableColumn (compartido por tabla y exportación)
├── layout/shell.*           ← Menú lateral (split pane) filtrado por rol
└── pages/                   ← Vistas (View) + su ViewModel (clase del componente)
```

- **Model:** `core/models`, servicios y stores.
- **ViewModel:** la clase de cada página expone señales `computed` derivadas del store y métodos de acción.
- **View:** plantillas HTML declarativas, sin manipulación directa del DOM.

El estado solo se modifica mediante métodos del store (flujo unidireccional); las vistas leen señales de solo lectura (`asReadonly()`), por lo que el estado es predecible.

## Enrutamiento y seguridad

- Todas las vistas se cargan con **lazy loading** (`loadComponent` / `loadChildren`) y precarga en segundo plano.
- **Guards funcionales**: `authGuard` (sesión), `guestGuard` (login/registro) y `permissionGuard` (`data.permissions`) con `canMatch`, para que el código de una sección protegida ni siquiera se descargue; `unsavedChangesGuard` (`canDeactivate`) en el formulario de producto.
- **RBAC por permisos** (`core/auth/permissions.ts`): cada rol tiene una lista de permisos `recurso:acción`; vistas, guards y API comprueban permisos, no roles. La directiva `*hasPermission` oculta lo que el usuario no puede usar.
- **JWT**: token de acceso de 15 min con `sub`, `role`, `perms` y `exp`, y token de refresco de 8 h. **La API verifica firma, caducidad y permiso en cada petición** (401/403), por lo que manipular el cliente no da acceso a los datos.
- **Interceptor HTTP** (`authInterceptor`): añade `Authorization: Bearer`; ante un 401 renueva el token y repite la petición, y ante un 403 lleva a *Acceso denegado*.
- Detalle y alternativas evaluadas: [Arquitectura de seguridad](security-architecture.md).
- Contraseñas almacenadas como **SHA-256 con sal**; nunca en claro.

## Orígenes de datos

| Origen | Implementación | Equivalente real |
| --- | --- | --- |
| API REST + SQL | **Supabase**: PostgreSQL + API REST (PostgREST) + Supabase Auth, mediante `supabaseBackendInterceptor`. Sin configuración, `mockBackendInterceptor` + `SqlDatabase` en el navegador | Supabase (real) |
| Tiempo real NoSQL | `RealtimeDbService` (`collectionChanges()` ≈ `onSnapshot`, `add()` ≈ `addDoc`) | Firebase Firestore (simulado) |

El origen SQL es real: usuarios y productos viven en Supabase, protegidos con Row Level Security (ver [Supabase](SUPABASE.md)). `app.config.ts` elige el interceptor según haya o no configuración, y los componentes no cambian. El origen NoSQL sigue simulado para no depender de un segundo servicio externo.

La carga inicial de ambas fuentes se orquesta en paralelo con **`forkJoin`**; después se mantiene una suscripción en tiempo real. Los validadores asíncronos usan `timer` + `switchMap` (debounce y cancelación de peticiones obsoletas).

## Rendimiento

- `ChangeDetectionStrategy.OnPush` en todos los componentes y Signals para reactividad fina.
- Series de gráficos memorizadas en `computed` (el gráfico solo se redibuja si cambian sus datos).
- jsPDF se importa dinámicamente solo al exportar.
- Registro selectivo de Chart.js (tree-shaking).
- Service Worker con precarga de la app.

## Ciclo de vida y memoria

- `ChartCard` crea el gráfico en `afterNextRender` y lo destruye en `ngOnDestroy`.
- Suscripciones con `takeUntilDestroyed`, `toSignal` o `rxResource` (se cancelan solas).
- `RealtimeDbService` detiene el simulador cuando no quedan suscriptores.
- Al cerrar sesión, `navigateRoot` destruye las vistas privadas y el `Shell` limpia el store.
