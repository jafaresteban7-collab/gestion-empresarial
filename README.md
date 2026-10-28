# GestiónPro · Sistema de gestión multiplataforma (PWA)

Aplicación de gestión de **inventario y pedidos** para un entorno empresarial, desarrollada con **Ionic 9 + Angular 22**.

Proyecto individual del módulo *Desarrollo de Interfaces (0488)*, CFGS Desarrollo de Aplicaciones Multiplataforma.

| | |
| --- | --- |
| 🌐 Aplicación en producción | `https://<tu-proyecto>.vercel.app` |
| 📚 Documentación técnica (Compodoc) | `https://<tu-proyecto>.vercel.app/docs/` |
| 📖 Manual de usuario | [docs/MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md) · también dentro de la app en **Ayuda** |
| 🏗️ Arquitectura | [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) |

> Las **credenciales de prueba** (Administrador y Usuario estándar) se facilitan en el documento de entrega, no en el repositorio. Las contraseñas solo se guardan como hash SHA-256 con sal.

## Funcionalidades

| Requisito | Implementación |
| --- | --- |
| Navegación global con lazy loading | Menú lateral Ionic (split pane), todas las vistas con `loadComponent`/`loadChildren` |
| Control de acceso por roles | Administrador / Usuario estándar, JWT, guards `canMatch`, interceptor HTTP, verificación 401/403 en la API |
| Formularios y validación asíncrona | Formularios reactivos; comprobación en vivo de email y SKU duplicados contra la API; two-way binding con `[(ngModel)]` |
| Componentes reutilizables | `DataTable`, `StatWidget`, `ChartCard`, `LoadState` con `input()` / `output()` |
| Consumo asíncrono SQL + NoSQL | API REST (SQL simulado) y base de datos en tiempo real tipo Firestore (NoSQL simulado), orquestados con `forkJoin` |
| Cuadro de mando | Chart.js con filtros en tiempo real (periodo, categoría, estado, clic en gráfico) |
| Exportación | PDF maquetado (jsPDF + autotable) y CSV (UTF-8, Excel) |
| Responsive mobile-first | Grid + Flexbox, tablas que pasan a tarjetas en móvil |
| Accesibilidad WCAG 2.1 AA | Contraste, tipografía en `rem`, navegación por teclado, enlace de salto, WAI-ARIA, tablas alternativas para gráficos |
| PWA | Service Worker + manifest, instalable |
| Calidad | Pruebas unitarias con Vitest, CI en GitHub Actions que bloquea el despliegue si fallan |

## Requisitos

- Node.js 22 o superior (probado con Node 24)
- npm 10 o superior

## Instalación y uso

```bash
npm ci
npm start
```

La aplicación queda disponible en http://localhost:4200.

| Script | Descripción |
| --- | --- |
| `npm start` | Servidor de desarrollo |
| `npm run test:ci` | Pruebas unitarias (una ejecución) |
| `npm run build` | Compilación de producción en `dist/gestion-empresarial/browser` |
| `npm run docs` | Genera la documentación Compodoc en `documentation/` |
| `npm run build:all` | Compilación de producción + documentación en `/docs` (lo usa la CI) |

## Flujo de trabajo Git

Se sigue **Git Flow**:

- `main`: versión estable desplegada en producción.
- `develop`: rama de integración.
- `feature/*`: una rama por funcionalidad, que se integra en `develop` mediante *Pull Request* (merge `--no-ff`).
- Para publicar, se integra `develop` en `main`.

## Integración y despliegue continuos

Workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. **test**: `npm ci`, pruebas unitarias y compilación de producción con documentación. Se ejecuta en cada *push* y *Pull Request* a `main` y `develop`.
2. **deploy**: solo en `main` y **solo si `test` ha pasado**. Despliega en Vercel con la CLI.

Configuración del despliegue (una sola vez):

1. Importar el repositorio en [Vercel](https://vercel.com/new). La configuración está en `vercel.json`, que desactiva el despliegue automático de Vercel para que solo despliegue la CI tras pasar las pruebas.
2. En GitHub, ir a *Settings → Secrets and variables → Actions* y crear `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`. Los dos IDs están en `.vercel/project.json` después de ejecutar `npx vercel link`.

## Datos y privacidad

Todos los datos son **sintéticos**: nombres ficticios, correos con el dominio reservado `.test` y proveedores inventados. No se exponen datos personales reales ni claves de APIs de terceros. La clave de firma del backend simulado no es un secreto real: en un backend de producción viviría solo en el servidor.

---

## Manual de usuario (resumen)

El manual completo está en [docs/MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md) y dentro de la app (**Menú → Ayuda** o el botón **?** de cada pantalla).

1. **Acceso:** introduzca correo y contraseña. Los usuarios nuevos pueden crear una cuenta estándar; el correo se valida mientras se escribe.
2. **Inicio:** resumen del inventario y de los pedidos del día.
3. **Cuadro de mando** (solo Administrador): indicadores con tendencia y cuatro gráficos. Puede filtrar por periodo, categoría y estado; al pulsar un sector del gráfico de categorías se filtra por ella. Se puede descargar el informe en PDF o CSV.
4. **Productos:** búsqueda, ordenación, filtros y exportación. El Administrador puede además dar de alta, editar y eliminar productos (el SKU es único y se valida en vivo).
5. **Actividad en tiempo real:** los pedidos aparecen automáticamente según se registran.
6. **Usuarios** (solo Administrador): listado de cuentas.
7. **Accesibilidad:** la app se usa por completo con teclado (`Tab`, `Intro`, `Espacio`, `Esc`) y es compatible con lectores de pantalla.
