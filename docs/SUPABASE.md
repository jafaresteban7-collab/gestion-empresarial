# Supabase: origen de datos SQL

GestiónPro guarda **usuarios y productos en Supabase**, un PostgreSQL en la nube que expone una **API REST** generada automáticamente (PostgREST). El inicio de sesión lo gestiona **Supabase Auth**. Los pedidos en tiempo real siguen en la base de datos documental (NoSQL) de la app.

## Cómo encaja en la app

Las pantallas y los servicios no saben que existe Supabase: siguen llamando a `/api/products`, `/api/auth/login`, etc. El interceptor `supabaseBackendInterceptor` (`src/app/core/api/`) traduce cada llamada:

| Llamada de la app | Petición a Supabase |
| --- | --- |
| `POST /api/auth/login` | `POST /auth/v1/token?grant_type=password` + `GET /rest/v1/profiles?id=eq.<uid>` |
| `POST /api/auth/refresh` | `POST /auth/v1/token?grant_type=refresh_token` |
| `POST /api/auth/register` | `POST /auth/v1/signup` (un trigger crea el perfil como Usuario estándar) |
| `GET /api/users/exists` | `POST /rest/v1/rpc/email_exists` |
| `GET /api/users` | `GET /rest/v1/profiles` |
| `GET/POST/PUT/DELETE /api/products…` | `GET/POST/PATCH/DELETE /rest/v1/products…` |

`authInterceptor` añade el JWT de Supabase (`Authorization: Bearer`) y, si caduca, lo renueva con el token de refresco. Los errores de PostgreSQL se convierten en los códigos que ya maneja la app: `23505` (SKU duplicado) → 409, `42501` (RLS) → 403, JWT caducado → 401.

Si no hay URL ni clave configuradas, la app usa la API REST simulada en el navegador (es lo que hacen las pruebas automáticas).

## Modelo de datos

Definido en [`supabase/migrations/20261031000000_gestionpro.sql`](../supabase/migrations/20261031000000_gestionpro.sql):

```
auth.users 1 ── 1 profiles (id, name, email UNIQUE, department, role CHECK admin|user, created_at)
products (id, sku UNIQUE CHECK ^[A-Z]{2}-[0-9]{3}$, name, category CHECK, stock CHECK >= 0, price CHECK >= 0, supplier, updated_at)
```

## Seguridad (Row Level Security)

| Tabla | Leer | Crear / editar / borrar |
| --- | --- | --- |
| `profiles` | Tu propio perfil; el administrador ve todos | Nadie desde la API: el rol solo se cambia con SQL |
| `products` | Cualquier usuario con sesión | Solo si `is_admin()` (rol `admin` en `profiles`) |

El usuario anónimo (`anon`) no puede leer ninguna tabla; solo puede llamar a `email_exists`. Por eso la clave pública (`anon`) puede estar en el navegador: sin sesión no da acceso a datos.

## Puesta en marcha

1. Crear un proyecto en [supabase.com](https://supabase.com) (plan Free).
2. **SQL Editor**: ejecutar `supabase/migrations/20261031000000_gestionpro.sql`.
3. **Authentication → Sign In / Providers → Email**: desactivar *Confirm email*.
4. **Authentication → Users → Add user** (marcando *Auto Confirm User*): `admin@empresa.test`, `usuario@empresa.test` y `analista@empresa.test`, con las contraseñas del documento de entrega.
5. **SQL Editor**: ejecutar `supabase/seed.sql` (24 productos, nombres y rol de administrador).
6. Copiar la **Project URL** y la clave **anon / publishable** (Project Settings → API Keys):
   - En local, en un fichero `.env.local` (está en `.gitignore`):
     ```
     SUPABASE_URL=https://xxxx.supabase.co
     SUPABASE_ANON_KEY=…
     ```
   - En producción, como secretos del repositorio en GitHub (*Settings → Secrets and variables → Actions*) con los mismos nombres. El pipeline se los pasa a la compilación. No sirven variables *Sensitive* de Vercel: el pipeline compila fuera de Vercel y solo recibe el texto `[SENSITIVE]`.

`npm start`, `npm run build` y el pipeline ejecutan antes `scripts/supabase-config.mjs`, que genera `src/environments/supabase.config.ts` con esos valores. Ese fichero no se sube al repositorio.
