# Arquitectura

Documento que describe la arquitectura y la lógica implementada hasta ahora. Las páginas y el middleware todavía no existen; solo hay lógica de servidor, de cliente y configuración.

## Dependencias (`package.json`)

- `@supabase/supabase-js` — cliente para hablar con Postgres de Supabase por HTTP.
- `bcryptjs` — hash de contraseñas.
- `jose` — firma y verificación de JWT.
- `libsodium-wrappers-sumo` — cifrado X25519 y sealed box en el navegador.

Se añadió el script `seed`:

```
"seed": "node --env-file=.env.local scripts/seed.mjs"
```

## Variables de entorno (`.env.example`)

Tres variables:

- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` — acceso a la base de datos.
- `AUTH_SECRET` — clave para firmar el JWT de sesión. Se genera con:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

En `.gitignore` se añadió `!.env.example` para que el ejemplo sí se pueda commitear, ya que `.env*` lo excluía.

## Esquema (`supabase/schema.sql`)

Una única tabla `usuario`:

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Clave primaria |
| `nombre` | text unique | Identificador de login |
| `password_hash` | text | Contraseña hasheada con bcrypt |
| `public_key` | text | Clave pública X25519 en base64, null hasta el primer login |
| `role` | text | `user` o `admin` |
| `usuario_asignado` | text | Ciphertext en base64, null hasta el sorteo |
| `viewed_at` | timestamptz | null hasta que el usuario ve la animación |

No se usa RLS. Solo la service role, desde el servidor, toca la tabla.

## Cliente de base de datos (`src/lib/db.js`)

Solo servidor. El cliente Supabase es lazy: no pide las variables de entorno hasta la primera consulta, para que el build no falle sin entorno configurado.

Funciones:

- `getUserByNombre(nombre)` — busca usuario para el login.
- `getUserById(id)` — devuelve la fila propia, usada por `/api/me`.
- `createUser(nombre, passwordHash, role)` — alta de usuario.
- `listUsers(includePublicKey)` — lista de usuarios. El admin recibe `public_key`; el usuario normal solo `id` y `nombre`.
- `updatePublicKey(id, publicKey)` — guarda la clave pública en el primer login.
- `markViewed(id)` — marca `viewed_at`.
- `applyAssignments(rows)` — escribe `usuario_asignado` y resetea `viewed_at` para cada fila.

## Autenticación (`src/lib/auth.js`)

Solo servidor. Combina bcrypt y JWT en cookie httpOnly.

- `hashPassword(password)` y `verifyPassword(password, hash)` — bcrypt.
- `signSession(user)` — firma un JWT HS256 con payload `{ sub: id, nombre, role }` y caducidad de 7 días.
- `verifyToken(token)` — verifica el JWT y devuelve el payload o `null`.
- `setSessionCookie(token)` y `clearSessionCookie()` — cookie httpOnly, `sameSite: lax`, `secure` en producción.
- `getSession(req)` — lee la cookie de la request y la verifica. Todas las rutas protegidas la usan.

## Cifrado (`src/lib/crypto.js`)

Solo cliente. Wrapper de libsodium.

- `generateKeypair()` — genera un keypair X25519 `{ publicKey, privateKey }`.
- `publicKeyFromPrivate(privateKey)` — deriva la clave pública a partir de la privada (necesaria para abrir un sealed box).
- `sealString(message, recipientPublicKey)` — `crypto_box_seal`, devuelve ciphertext en base64.
- `openString(ciphertextB64, publicKey, privateKey)` — abre el sealed box y devuelve el mensaje en texto.
- `encodePublicKey` / `decodePublicKey` — conversión a/desde base64.

## Almacenamiento de claves (`src/lib/keys.js`)

Solo cliente. Guarda la clave privada en IndexedDB (`amigo-invisible` / `keys` / `privateKey`). Nunca sale del dispositivo.

- `loadPrivateKey()` — lee la clave privada.
- `ensureKeys()` — devuelve `{ privateKey, publicKey, isNew }`. Si ya existe la clave privada, la usa y deriva la pública; si no, genera un keypair, guarda la privada y devuelve ambas.

## API routes

Todas verifican el JWT con `getSession`, salvo login. El permiso de admin se comprueba con `session.role === "admin"`.

| Ruta | Método | Acceso | Descripción |
|---|---|---|---|
| `/api/login` | POST | público | Valida credenciales con bcrypt, setea la cookie y devuelve el role |
| `/api/logout` | POST | autenticado | Borra la cookie |
| `/api/me` | GET | autenticado | Devuelve la fila propia (incluye `usuario_asignado` y `viewed_at`) |
| `/api/me/public-key` | POST | autenticado | Sube `public_key` |
| `/api/me/viewed` | POST | autenticado | Marca `viewed_at` |
| `/api/users` | GET | autenticado | Lista de usuarios (el admin ve `public_key`) |
| `/api/users` | POST | admin | Crea usuario; responde 409 si el nombre ya existe |
| `/api/randomize` | POST | admin | Valida ids, persiste ciphertext y resetea `viewed_at` |

## Seed (`scripts/seed.mjs`)

`npm run seed` con `ADMIN_NOMBRE` y `ADMIN_PASSWORD` en el entorno. Hace un upsert de un usuario admin sobre `nombre`.

## Flujo completo

1. **Login** — `POST /api/login` valida con bcrypt y setea la cookie JWT.
2. **Primer login** — el cliente llama `ensureKeys()`, guarda la clave privada en IndexedDB y sube la pública a `POST /api/me/public-key`.
3. **Randomize** — el admin hace `GET /api/users` (con `public_key`), calcula el derangement en el navegador, cifra el asignado de cada usuario con `sealString` y hace `POST /api/randomize`.
4. **Reveal** — el usuario hace `GET /api/me`, abre su ciphertext con `openString` y resuelve el UUID en el nombre.

## Pendiente

- Middleware de protección de rutas.
- Páginas `login`, `admin` y `reveal`.
- Lógica del derangement (vive en la página admin, aún no implementada).
