# Arquitectura

Documento que describe la arquitectura y la lógica implementada. Las páginas y el middleware todavía no existen; hay lógica de servidor, de cliente, configuración y tests.

## Dependencias (`package.json`)

- `@supabase/supabase-js` — cliente para hablar con Postgres de Supabase por HTTP.
- `bcryptjs` — hash de contraseñas.
- `jose` — firma y verificación de JWT.
- `libsodium-wrappers-sumo` — cifrado X25519 y sealed box en el navegador.

Scripts:

```
"seed": "node --env-file=.env.local scripts/seed.mjs"
"test": "node --test \"tests/**/*.test.mjs\""
"test:e2e": "node --env-file=.env.local --test \"tests/**/*.integration.mjs\""
```

## Variables de entorno (`.env.example`)

Tres variables:

- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` — acceso a la base de datos.
- `AUTH_SECRET` — clave para firmar el JWT de sesión. Se genera con:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Los tests e2e leen además `E2E_BASE_URL`, `E2E_ADMIN_NOMBRE` y `E2E_ADMIN_PASSWORD` (en `.env.local`, no en el ejemplo).

En `.gitignore` se añadió `!.env.example` para que el ejemplo sí se pueda commitear, ya que `.env*` lo excluía.

## Esquema (`supabase/schema.sql`)

Tabla `usuario`:

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Clave primaria |
| `nombre` | text unique | Identificador de login |
| `password_hash` | text | Contraseña hasheada con bcrypt |
| `public_key` | text | Clave pública X25519 en base64, null hasta el primer login |
| `role` | text | `user` o `admin`, con constraint `usuario_role_check` |
| `usuario_asignado` | text | Ciphertext en base64, null hasta el sorteo |
| `viewed_at` | timestamptz | null hasta que el usuario ve la animación |
| `token_version` | integer | Versión del token; subirla revoca las sesiones del usuario |
| `created_at` | timestamptz | Alta |

Tabla `login_attempt`:

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | bigint identity | Clave primaria |
| `nombre` | text | Nombre intentado |
| `ip` | text | IP del intento (`x-forwarded-for`) |
| `created_at` | timestamptz | Momento del intento |

Índice `login_attempt_lookup (nombre, ip, created_at)`.

El schema es idempotente y re-ejecutable: `create table if not exists`, `alter table ... add column if not exists`, constraint con `exception when duplicate_object`, e índice `if not exists`.

RLS activo y **sin políticas**: `anon` y `authenticated` quedan denegados; `service_role` bypassa RLS. Todo el acceso a la BD pasa por el servidor.

## Cliente de base de datos (`src/lib/db.js`)

Solo servidor. El cliente Supabase es lazy: no pide las variables de entorno hasta la primera consulta, para que el build no falle sin entorno configurado.

Funciones:

- `getUserByNombre(nombre)` — busca usuario para el login (incluye `password_hash` y `token_version`).
- `getUserById(id)` — devuelve la fila propia (incluye `token_version`).
- `createUser(nombre, passwordHash, role)` — alta de usuario.
- `listUsers(includePublicKey)` — lista de usuarios. El admin recibe `public_key`; el usuario normal solo `id` y `nombre`.
- `updatePublicKey(id, publicKey)` — guarda la clave pública en el primer login.
- `markViewed(id)` — marca `viewed_at`.
- `applyAssignments(rows)` — escribe `usuario_asignado` y resetea `viewed_at` para cada fila, en un único `upsert` batch (atómico).
- `countLoginAttempts(nombre, ip, sinceIso)` — cuenta intentos recientes de login.
- `recordLoginAttempt(nombre, ip, cutoffIso)` — registra un fallo y purga intentos viejos.
- `clearLoginAttempts(nombre, ip)` — limpia los intentos tras un login correcto.

## Autenticación (`src/lib/auth.js`)

Solo servidor. Combina bcrypt y JWT en cookie httpOnly.

- `hashPassword(password)` y `verifyPassword(password, hash)` — bcrypt.
- `signSession(user)` — firma un JWT HS256 con payload `{ sub: id, nombre, role, tv }` y caducidad de 7 días. `tv` es `token_version`.
- `verifyToken(token)` — verifica el JWT y devuelve el payload o `null`.
- `setSessionCookie(token)` y `clearSessionCookie()` — cookie httpOnly, `sameSite: lax`, `secure` en producción.
- `getSession(req)` — lee la cookie, verifica el JWT y **revalida contra la BD**: el usuario debe existir y `token_version` debe coincidir con el del token. Devuelve el `role` fresco. Subir `token_version` en la BD revoca todas las sesiones de ese usuario.

## Cifrado (`src/lib/crypto.js`)

Solo cliente (`"use client"`). Wrapper de libsodium.

- `generateKeypair()` — genera un keypair X25519 `{ publicKey, privateKey }`.
- `publicKeyFromPrivate(privateKey)` — deriva la clave pública a partir de la privada (necesaria para abrir un sealed box).
- `sealString(message, recipientPublicKey)` — `crypto_box_seal`, devuelve ciphertext en base64.
- `openString(ciphertextB64, publicKey, privateKey)` — abre el sealed box y devuelve el mensaje en texto.
- `encodePublicKey` / `decodePublicKey` — conversión a/desde base64.

## Almacenamiento de claves (`src/lib/keys.js`)

Solo cliente (`"use client"`). Guarda la clave privada en IndexedDB (`amigo-invisible` / `keys` / `privateKey`). Nunca sale del dispositivo.

- `loadPrivateKey()` — lee la clave privada.
- `ensureKeys()` — devuelve `{ privateKey, publicKey, isNew }`. Si ya existe la clave privada, la usa y deriva la pública; si no, genera un keypair, guarda la privada y devuelve ambas.

## API routes

Todas verifican el JWT con `getSession`, salvo login. El permiso de admin se comprueba con `session.role === "admin"` (rol revalidado contra la BD en cada petición).

| Ruta | Método | Acceso | Descripción |
|---|---|---|---|
| `/api/login` | POST | público | Valida credenciales con bcrypt. Límite de 5 intentos / 15 min por (nombre, IP) → 429. Setea la cookie y devuelve el role |
| `/api/logout` | POST | autenticado | Borra la cookie |
| `/api/me` | GET | autenticado | Devuelve la fila propia (incluye `usuario_asignado` y `viewed_at`, sin `token_version`) |
| `/api/me/public-key` | POST | autenticado | Valida base64 / 32 bytes y guarda `public_key`. Responde 409 si ya hay una distinta y no se envía `force: true` |
| `/api/me/viewed` | POST | autenticado | Marca `viewed_at` |
| `/api/users` | GET | autenticado | Lista de usuarios (el admin ve `public_key`) |
| `/api/users` | POST | admin | Crea usuario; 400 si `role` no es `user`/`admin`; 409 si el nombre ya existe |
| `/api/randomize` | POST | admin | Valida formato, existencia, unicidad y cobertura total (todos los usuarios, todos con `public_key`), persiste ciphertext y resetea `viewed_at` |

## Seed (`scripts/seed.mjs`)

`npm run seed` con `ADMIN_NOMBRE` y `ADMIN_PASSWORD` en el entorno. Hace un upsert de un usuario admin sobre `nombre`.

## Tests

- `tests/crypto.test.mjs` — 9 tests unitarios con `node:test`, sin dependencias ni BD: keypair de 32 bytes, derivación de la pública, roundtrip base64, `seal`/`open`, unicode, tamaño `msg+48`, no-determinismo, fallo con clave ajena y con ciphertext corrupto. Se ejecuta con `npm test`.
- `tests/e2e.integration.mjs` — 7 tests de integración con `fetch` contra `next dev` y Supabase real: login, rate limit, `/api/me`, `public-key` (400/200/409/force), `randomize` (403/400) y flujo completo (crear → claves → derangement → seal → randomize → reveal). Crea usuarios `e2e_*` y los borra al final, restaura la fila del admin, y se salta el sorteo si detecta usuarios reales ajenos. Requiere `npm run dev` y las variables `E2E_*`. Se ejecuta con `npm run test:e2e`.

## Flujo completo

1. **Login** — `POST /api/login` valida con bcrypt (con rate limit) y setea la cookie JWT.
2. **Primer login** — el cliente llama `ensureKeys()`, guarda la clave privada en IndexedDB y sube la pública a `POST /api/me/public-key`.
3. **Randomize** — el admin hace `GET /api/users` (con `public_key`), calcula el derangement en el navegador, cifra el asignado de cada usuario con `sealString` y hace `POST /api/randomize`.
4. **Reveal** — el usuario hace `GET /api/me`, abre su ciphertext con `openString` y resuelve el UUID en el nombre.

## Funcionalidades por rol (lógica actual)

**Usuario normal:**

- Iniciar sesión con nombre y contraseña.
- Cerrar sesión.
- Ver su propia fila (incluye su `usuario_asignado` cifrado y `viewed_at`).
- Generar su keypair y subir la clave pública en el primer login.
- Marcar la animación como vista.
- Listar usuarios (solo `id` y `nombre`) para resolver el UUID del asignado.
- Revelar su amigo invisible descifrando el sealed box en el navegador.

**Admin (todo lo anterior más):**

- Crear usuarios (nombre + contraseña, rol `user` o `admin`).
- Listar usuarios con `public_key`.
- Randomizar: derangement en el navegador, cifrado por destinatario y persistencia.
- Re-randomizar (sobrescribe el sorteo anterior y resetea `viewed_at`).

**Aún no existe (lógica pendiente):**

- Middleware de protección de rutas.
- Páginas `login`, `admin` y `reveal`.
- Lógica del derangement en la página admin.
- Polling de la animación en directo.
