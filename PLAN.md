# Plan técnico — Amigo Invisible (tenerife-invisible)

Documento para desarrolladores. Describe arquitectura, modelo de datos, flujos de cifrado y plan de implementación.

## 1. Resumen del producto

Aplicación web de "amigo invisible" para un grupo fijo de usuarios.

- El admin crea las cuentas (nombre + contraseña) directamente. Sin invitación por email.
- Cada usuario inicia sesión con su nombre y contraseña.
- El admin pulsa un botón "randomizar" que asigna a cada usuario otro usuario al azar (sin autoasignación).
- Cada usuario ve únicamente su propio asignado. Ni el servidor ni un desarrollador con acceso a la base de datos pueden leerlo: la columna guarda ciphertext.
- Solo existe el sorteo actual. Re-randomizar sobreescribe el anterior.

## 2. Stack y decisiones de diseño

| Tema | Decisión | Motivo |
|---|---|---|
| Frontend | Next.js 16 (App Router), JavaScript | Ya montado |
| Base de datos | Supabase (solo Postgres) | Postgres gestionado |
| Acceso a BD | Service role, solo servidor | El cliente nunca habla con Supabase |
| RLS | Activo, sin políticas | `anon`/`authenticated` denegados; solo `service_role` |
| Auth | Propia: bcrypt + JWT en cookie httpOnly | Sin email, sin Supabase Auth |
| Cifrado | ECIES con keypair X25519 por dispositivo (`crypto_box_seal`) | El servidor solo guarda ciphertext |
| Clave privada | IndexedDB del dispositivo | Nunca sale del navegador |
| Clave pública | Columna `public_key` | La usa el navegador del admin para cifrar |
| Sorteo | Lógica en el navegador del admin (sin Edge Function) | El admin ve el mapping un instante; aceptado |
| Directo | Polling cada 2-3 s | Sin Realtime, más simple |
| Deploy | Vercel | Serverless |

### Por qué no Supabase Auth ni Realtime

La autenticación es propia (bcrypt + JWT), así que no se usa `auth.users` ni Supabase Auth. RLS está activo pero **sin políticas**: `anon`/`authenticated` quedan denegados y todo el acceso pasa por API routes del servidor con la service role. El cliente no tiene la anon key. La animación "en directo" se resuelve con polling, no con Realtime.

## 3. Modelo de datos

Una única tabla `usuario`.

```sql
create table usuario (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  password_hash text not null,
  public_key text,          -- base64, 32 bytes, null hasta el primer login
  role text not null default 'user',   -- 'user' | 'admin', con constraint
  usuario_asignado text,    -- base64 ciphertext (sealed box), null hasta el sorteo
  viewed_at timestamptz,    -- null hasta que ve la animación
  token_version integer not null default 0,   -- subirla revoca las sesiones
  created_at timestamptz not null default now()
);

create table login_attempt (
  id bigint generated always as identity primary key,
  nombre text not null,
  ip text not null,
  created_at timestamptz not null default now()
);
```

Notas:

- `public_key` es la clave pública X25519 (32 bytes, en base64). La sube el cliente en el primer login.
- `usuario_asignado` es el resultado de `crypto_box_seal(uuid_asignado, public_key_destinatario)`. Solo ese usuario puede abrirlo con su clave privada.
- No hay columna de asignado en claro. El mapping no se persiste en ningún sitio.
- `login_attempt` guarda los fallos de login para el rate limit; índice `(nombre, ip, created_at)`.
- `token_version` permite revocar sesiones: subir el valor invalida los JWT ya emitidos.
- RLS activo y sin políticas: `anon`/`authenticated` denegados, `service_role` bypassa. El schema es idempotente y re-ejecutable.

## 4. Autenticación

- Contraseña hasheada con bcrypt (coste 10).
- Al iniciar sesión, el servidor firma un JWT (HS256) con `{ sub: id, nombre, role, tv }` y lo guarda en una cookie httpOnly, con `secure` en producción y caducidad de 7 días. `tv` es `token_version`.
- `getSession` revalida contra la BD en cada petición: usuario existente y `token_version` coincidente. Devuelve el rol fresco, así un cambio de rol o una revocación surten efecto sin esperar a que caduque el token.
- Rate limit de login: 5 intentos / 15 min por (nombre, IP) → 429.
- El middleware (pendiente) protegerá `/admin` (solo role admin) y `/reveal` (cualquier autenticado).
- Cada API route verifica el JWT, salvo `login`.

## 5. Flujos de cifrado

### 5.1 Primer login

```
keypair = crypto_box_keypair()          # X25519, generado en el navegador
privateKey -> IndexedDB                 # nunca sale del dispositivo
publicKey  -> POST /api/me/public-key   # se guarda en usuario.public_key
```

### 5.2 Sorteo (navegador del admin)

```
1. GET /api/users                       # admin recibe id + public_key de todos
2. Derangement en el navegador          # nadie se asigna a sí mismo
3. Por cada usuario:
   ciphertext = crypto_box_seal(uuid_asignado, public_key_destinatario)
4. POST /api/randomize [{user_id, ciphertext}]
5. Servidor: update usuario_asignado = ciphertext, viewed_at = null
```

El servidor nunca ve el mapping. Solo persiste ciphertext.

### 5.3 Revelación (cliente)

```
asignado = crypto_box_seal_open(ciphertext, publicKey, privateKey)
nombre   = resolver uuid -> nombre en la lista de usuarios
```

### 5.4 Cambio de dispositivo

`privateKey` vive en IndexedDB y no se sincroniza. Si el usuario cambia de dispositivo o borra datos del navegador, pierde acceso a su asignado. Solución: el admin re-sortea. Coste aceptado para un evento de grupo pequeño.

Para evitar sobrescribir la clave sin querer, `POST /api/me/public-key` responde 409 si ya existe una clave distinta; hay que enviar `force: true` para reemplazarla (y se pierde el asignado cifrado con la anterior).

## 6. API

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/login` | público | Valida credenciales, setea cookie |
| POST | `/api/logout` | autenticado | Borra la cookie |
| GET | `/api/me` | autenticado | Devuelve fila propia (id, nombre, role, usuario_asignado, viewed_at) |
| POST | `/api/me/public-key` | autenticado | Guarda `public_key` |
| POST | `/api/me/viewed` | autenticado | Marca `viewed_at` |
| GET | `/api/users` | autenticado | Usuario: id + nombre. Admin: id + nombre + public_key |
| POST | `/api/users` | admin | Crea usuario (nombre + contraseña) |
| POST | `/api/randomize` | admin | Persiste los ciphertext y resetea `viewed_at` |

Notas: `/api/login` limita a 5 intentos/15 min por (nombre, IP). `/api/me/public-key` valida base64/32 bytes y responde 409 ante una clave distinta sin `force`. `/api/randomize` exige cobertura total, sin `user_id` duplicados y con `public_key` presente en todos los usuarios; persiste en un `upsert` batch.

## 7. Estructura de archivos

```
src/lib/db.js                      -- cliente Supabase (service role, lazy)
src/lib/auth.js                    -- bcrypt + JWT + cookie
src/lib/crypto.js                  -- libsodium: keypair, seal, open (cliente)
src/lib/keys.js                    -- IndexedDB: guardar/cargar privateKey (cliente)
src/middleware.js                  -- protege /admin y /reveal
src/app/api/login/route.js
src/app/api/logout/route.js
src/app/api/me/route.js
src/app/api/me/public-key/route.js
src/app/api/me/viewed/route.js
src/app/api/users/route.js
src/app/api/randomize/route.js
src/app/login/page.jsx
src/app/admin/page.jsx             -- crear usuarios + botón randomizar
src/app/reveal/page.jsx            -- pantalla de revelación (polling + animación)
supabase/schema.sql
scripts/seed.mjs                   -- crea el primer admin
tests/crypto.test.mjs              -- tests unitarios (node:test, sin deps)
tests/e2e.integration.mjs          -- tests de integración (dev server + Supabase)
```

## 8. Dependencias

```
@supabase/supabase-js
bcryptjs
jose
libsodium-wrappers-sumo
```

## 9. Configuración

Variables de entorno (`.env.local`):

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SECRET=            # cualquier string largo y aleatorio para firmar JWT
```

Los tests e2e añaden `E2E_BASE_URL`, `E2E_ADMIN_NOMBRE` y `E2E_ADMIN_PASSWORD` (solo en `.env.local`).

Supabase:

1. Crear proyecto.
2. Ejecutar `supabase/schema.sql`.
3. Copiar URL y service role key a `.env.local`.

Vercel:

1. Añadir las tres variables de entorno en el proyecto.
2. Desplegar.

Seed del admin (una vez):

```
npm run seed          # usa ADMIN_NOMBRE y ADMIN_PASSWORD
```

## 10. Orden de implementación

1. `.env.example` + `supabase/schema.sql`.
2. `lib/db.js` + `lib/auth.js`.
3. `lib/crypto.js` + `lib/keys.js`.
4. API routes.
5. Middleware.
6. Páginas: login, admin, reveal.
7. Seed del admin.

## 11. Detalles que muerden

- Todos los usuarios deben haber iniciado sesión una vez antes de randomizar; sin `public_key` no reciben asignación.
- Derangement requiere mínimo 2 usuarios.
- `crypto_box_seal` es un sealed box: solo el destinatario lo abre.
- `privateKey` solo en IndexedDB. Nunca en la base de datos ni en el servidor.
- `usuario_asignado` guarda ciphertext en base64, nunca texto claro.
- No loguear el mapping ni los ciphertext.
- La service role key nunca debe exponerse al cliente. Solo en rutas del servidor.
- El admin ve el mapping un instante en su navegador durante el sorteo. Aceptado.
- Cookie de sesión con `secure` en producción.
- RLS activo y sin políticas: `anon`/`authenticated` denegados; solo `service_role`.
- Rate limit de login: 5 intentos / 15 min por (nombre, IP).
- Revocación de sesiones subiendo `usuario.token_version`.
