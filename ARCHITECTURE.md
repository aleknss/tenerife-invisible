# Arquitectura

Documento para developers. Describe arquitectura, modelo de datos, API y una guía para construir el frontend. El backend está completo; el middleware y las páginas todavía no existen.

## Decisiones de diseño (cerradas)

- **Evento único**: toda la app es un evento; una fila `config` (id=1).
- **Pregunta anónima**: el receptor no ve el autor; el admin **no tiene endpoint** para ver preguntas ni respuestas (solo acceso directo a BD). Cada participante ve solo las suyas.
- **Realtime = polling** (2-3 s) sobre `GET /api/estado`.
- **Tallas fijas**: `camiseta`, `pantalon`, `zapato`, `gorro`, `guantes` (jsonb libre, la UI decide las claves).
- **Vetos solo admin** (no hay auto-veto del usuario).
- **Umbral "todos listos"**: lo controla el admin desde la UI (contador + `umbral_listos`). El backend **no bloquea** el sorteo si alguien no está listo.
- **Re-sorteo** permitido en estado `abierto` y `sorteado` (sobrescribe).

## Stack (`package.json`)

- `@supabase/supabase-js` — cliente Postgres (Supabase) por HTTP.
- `bcryptjs` — hash de contraseñas.
- `jose` — firma y verificación de JWT.

Frontend:

- Next.js 16 (App Router), React 19, JavaScript (sin TypeScript).
- Tailwind CSS 4.
- Fuentes Geist (`src/app/layout.js`).

Scripts:

```
"dev": "next dev"
"build": "next build"
"start": "next start"
"seed": "node --env-file=.env.local scripts/seed.mjs"
"test": "node --test \"tests/**/*.test.mjs\""
"test:e2e": "node --env-file=.env.local --test \"tests/**/*.integration.mjs\""
```

## Variables de entorno (`.env.example`)

Tres variables:

- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` — acceso a la BD.
- `AUTH_SECRET` — clave para firmar el JWT de sesión. Se genera con:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Los tests e2e leen además `E2E_BASE_URL`, `E2E_ADMIN_NOMBRE` y `E2E_ADMIN_PASSWORD` (en `.env.local`, no en el ejemplo).

### ⚠️ Nota de seguridad

El admin se crea con `npm run seed` usando `ADMIN_NOMBRE`/`ADMIN_PASSWORD`. La contraseña vive en `.env.local` (`E2E_ADMIN_PASSWORD`). Si el repo se comparte, **cambiar la contraseña y rotar**. El `.gitignore` excluye `.env*` salvo `!.env.example`.

## Esquema (`supabase/schema.sql`)

### Tabla `usuario`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Clave primaria |
| `nombre` | text unique | Identificador de login |
| `password_hash` | text | Contraseña hasheada con bcrypt |
| `role` | text | `user` o `admin`, constraint `usuario_role_check` |
| `asignado_id` | uuid → usuario | Receptor en claro (B), null hasta el sorteo |
| `hobbies` | text | Intereses, texto libre |
| `tallas` | jsonb | `{ camiseta, pantalon, zapato, gorro, guantes }` |
| `palabra_vetada` | text | Objeto no deseado |
| `estado` | text | `pendiente` o `listo`, constraint `usuario_estado_check` |
| `viewed_at` | timestamptz | null hasta que ve la animación |
| `token_version` | integer | Subirla revoca las sesiones |
| `created_at` | timestamptz | Alta |

### Tabla `config` (evento único, fila `id = 1`)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | int | Siempre 1 |
| `nombre` | text | Nombre del evento |
| `precio` | numeric | Precio tope del regalo |
| `moneda` | text | Default `EUR` |
| `fecha_entrega` | date | Fecha de entrega |
| `tematica` | text | Temática opcional |
| `metodo_entrega` | text | presencial / online / correo / ... |
| `invisible_real` | bool | Default `true` |
| `reglas` | text | Texto libre |
| `umbral_listos` | integer | Nº de "listos" para habilitar el sorteo |
| `estado` | text | `abierto` / `sorteado` / `revelado` / `cerrado` |

### Tablas auxiliares

- `veto` — parejas vetadas (`a_id`, `b_id`, normalizadas `a_id < b_id`, `unique(a_id, b_id)`).
- `pregunta` — una pregunta por usuario (`unique(autor_id)`), anónima para el receptor: `autor_id`, `destinatario_id`, `texto`, `respuesta`, `respondida_at`.
- `asignacion` — historial de sorteos por año (`anio`, `dador_id`, `receptor_id`, `unique(anio, dador_id)`, `unique(anio, receptor_id)`). Sirve para "no repetir el año pasado".
- `login_attempt` — intentos de login fallidos para el rate limit; índice `(nombre, ip, created_at)`.

El schema es idempotente: `create table if not exists`, `alter table ... add/drop column if not exists`, constraints con `exception when duplicate_object`, índices `if not exists`.

RLS activo y **sin políticas**: `anon` y `authenticated` denegados; `service_role` bypassa. Todo el acceso a la BD pasa por el servidor.

## Cliente de base de datos (`src/lib/db.js`)

Solo servidor. El cliente Supabase es lazy: no pide variables de entorno hasta la primera consulta, para que el build no falle sin entorno configurado.

Funciones:

- `getUserByNombre(nombre)` — para el login (`password_hash`, `token_version`).
- `getUserById(id)` — fila propia (`role`, `viewed_at`, `token_version`).
- `getUserWithHash(id)` — fila con `password_hash` (para cambio de contraseña).
- `updatePassword(id, passwordHash, tokenVersion)` — guarda hash + sube `token_version`.
- `createUser(nombre, passwordHash, role)` — alta de usuario.
- `listUsers()` — lista `id` + `nombre` de todos.
- `markViewed(id)` — marca `viewed_at`.
- `countLoginAttempts` / `recordLoginAttempt` / `clearLoginAttempts` — rate limit.
- `getConfig()` / `updateConfig(fields)` — fila única del evento.
- `listParticipants()` — todos los usuarios con `estado`, `asignado_id`, `hobbies`, `tallas`, `palabra_vetada`, `viewed_at`.
- `getUserState(id)` — `estado` y `asignado_id` propios.
- `setParticipantForm(id, fields)` — guarda `hobbies`/`tallas`/`palabra_vetada`.
- `setListo(id)` — marca `estado = 'listo'`.
- `listVetos` / `addVeto` / `removeVeto` — gestión de vetos (normaliza `a_id < b_id`).
- `getPrevios(anio)` — asignaciones de un año, para evitar repetir.
- `applySorteo(mapping, anio)` — escribe `asignado_id` por fila y guarda historial en `asignacion`.
- `getReceptorProfile(dadorId)` — perfil del receptor + `viewed_at` del dador.
- `getPreguntaEnviada` / `getPreguntaRecibida` / `createPregunta` / `responderPregunta` — preguntas anónimas.

### ⚠️ `applySorteo` no es atómico

Escribe `asignado_id` con un `update` por fila en bucle (un `upsert batch` insertaba en vez de actualizar por la FK autorreferencial `asignado_id`). Si la atomicidad importa, pasar a una RPC de Postgres.

## Autenticación (`src/lib/auth.js`)

Solo servidor. bcrypt + JWT en cookie httpOnly.

- `hashPassword` / `verifyPassword` — bcrypt (coste 10).
- `signSession(user)` — JWT HS256, payload `{ sub, nombre, role, tv }`, caducidad 7 días. `tv` = `token_version`.
- `verifyToken(token)` — verifica el JWT, devuelve payload o `null`.
- `setSessionCookie` / `clearSessionCookie` — cookie httpOnly, `sameSite: lax`, `secure` en producción.
- `getSession(req)` — lee cookie, verifica JWT y **revalida contra BD**: usuario existente y `token_version` coincidente. Devuelve `role` fresco. Subir `token_version` revoca todas las sesiones del usuario.

## Sorteo (`src/lib/sorteo.js`)

Lógica pura, sin BD. `sortear(ids, { vetos, previos })` devuelve `{ ok, asignacion }` (Map dador→receptor) o `{ ok: false, reason, bloqueado }`.

Algoritmo bipartito (Kuhn aleatorio): nadie se autoasigna, respeta vetos (en ambos sentidos) y no repite asignación del año anterior. Si no hay solución, devuelve qué participante bloquea.

## API routes

Todas verifican JWT con `getSession`, salvo `login`. El permiso admin se comprueba con `session.role === "admin"` (rol revalidado contra la BD en cada petición).

| Ruta | Método | Acceso | Descripción |
|---|---|---|---|
| `/api/login` | POST | público | bcrypt + rate limit 5 intentos/15 min por (nombre, IP) → 429. Setea cookie, devuelve role |
| `/api/logout` | POST | autenticado | Borra la cookie |
| `/api/me` | GET | autenticado | Fila propia (`id`, `nombre`, `role`, `viewed_at`) |
| `/api/me/form` | PATCH | autenticado | Guarda `hobbies`/`tallas`/`palabra_vetada`. Solo con estado `abierto` |
| `/api/me/listo` | POST | autenticado | Marca `estado = 'listo'`. Solo con estado `abierto` |
| `/api/me/password` | POST | autenticado | Cambia contraseña (verifica actual, sube `token_version`, re-firma sesión) |
| `/api/me/asignado` | GET | autenticado | Perfil del receptor (`nombre`, `hobbies`, `tallas`, `palabra_vetada`) + `viewed_at` |
| `/api/me/viewed` | POST | autenticado | Marca `viewed_at` |
| `/api/me/pregunta` | GET / POST | autenticado | GET: enviada + recibida. POST: crea pregunta (una por autor, requiere `sorteado` y tener asignado) |
| `/api/me/pregunta/respuesta` | POST | autenticado | Responde una pregunta recibida |
| `/api/users` | GET | autenticado | Lista `id` + `nombre` |
| `/api/users` | POST | admin | Crea usuario; 400 si `role` inválido; 409 si nombre existe |
| `/api/estado` | GET | autenticado | `{ estado, umbral_listos, total, listos, listo_yo, tengo_asignado }` |
| `/api/config` | GET / PATCH | autenticado / admin | GET: config del evento. PATCH (admin): actualiza campos |
| `/api/admin/vetos` | GET / POST / DELETE | admin | Lista / añade / quita vetos |
| `/api/admin/sortear` | POST | admin | Ejecuta `sortear()` con vetos + previos, escribe `asignado_id`, pasa estado a `sorteado`. Permite re-sortear en `abierto`/`sorteado` |

## Guía para el frontend

### Auth desde el cliente

- La sesión es una cookie httpOnly llamada `session`. El JS del navegador **no la lee ni la escribe**; un `fetch` same-origin la envía sola. No hay tokens en localStorage ni cabeceras manuales.
- `POST /api/login` setea la cookie; `POST /api/logout` la borra.
- Convenciones de error: `401` no autenticado → redirigir a `/login`; `403` no admin; `409` conflicto de estado (evento cerrado, pregunta ya enviada, etc.); `400` validación.
- El cliente no maneja claves ni cifrado.

### Máquina de estados

- Global (`config.estado`): `abierto` → `sorteado` → `revelado` → `cerrado`.
- Por usuario (`usuario.estado`): `pendiente` → `listo`.
- Polling: `GET /api/estado` cada 2-3 s devuelve `{ estado, umbral_listos, total, listos, listo_yo, tengo_asignado }`. La UI decide qué pantalla mostrar según `estado` y `tengo_asignado`.

### Endpoints por pantalla

**`/login`**
- `POST /api/login` `{ nombre, password }` → `200 { role, nombre }` + cookie. Errores: `400`, `401`, `429`.

**`/` (main, usuario)**
- `GET /api/estado` → estado global + contador.
- `GET /api/me` → `{ id, nombre, role, viewed_at }`.
- `PATCH /api/me/form` `{ hobbies?, tallas?, palabra_vetada? }` (solo `abierto`). `tallas` = objeto `{ camiseta, pantalon, zapato, gorro, guantes }`.
- `POST /api/me/listo` (solo `abierto`).
- `GET /api/me/asignado` → `{ asignado: { id, nombre, hobbies, tallas, palabra_vetada } | null, viewed_at }`.
- `POST /api/me/viewed` → marcar animación vista.
- `GET /api/me/pregunta` → `{ enviada, recibida }`.
- `POST /api/me/pregunta` `{ texto }` (una sola; `409` si ya envió o no tiene asignado).
- `POST /api/me/pregunta/respuesta` `{ pregunta_id, respuesta }`.
- `POST /api/me/password` `{ actual, nueva }`.
- `POST /api/logout`.

**`/admin`**
- `GET /api/config` → config del evento.
- `PATCH /api/config` `{ nombre?, precio?, ... }` (solo admin).
- `GET /api/users` → `[{ id, nombre }]`.
- `POST /api/users` `{ nombre, password, role }` → `201 { id, nombre, role }`.
- `GET /api/admin/vetos` → `[[a_id, b_id], ...]`.
- `POST /api/admin/vetos` `{ a_id, b_id }`; `DELETE /api/admin/vetos` `{ a_id, b_id }`.
- `POST /api/admin/sortear` → `200 { ok }` o `400 { error, bloqueado }` (vetos imposibles).
- `GET /api/estado` → contador de listos para habilitar el botón sortear.

### Formas de datos (shapes)

```
GET /api/estado
{ estado, umbral_listos, total, listos, listo_yo, tengo_asignado }

GET /api/me/asignado
{ asignado: { id, nombre, hobbies, tallas, palabra_vetada } | null, viewed_at }

GET /api/me/pregunta
{
  enviada: { id, texto, respuesta, respondida_at } | null,
  recibida: { id, texto, respondida_at } | null
}

GET /api/config
{ id, nombre, precio, moneda, fecha_entrega, tematica, metodo_entrega,
  invisible_real, reglas, umbral_listos, estado, created_at }
```

### Notas de implementación

- Las páginas de datos viven en `src/app/` (App Router): `src/app/login/page.jsx`, `src/app/page.js` (main), `src/app/admin/page.jsx`.
- Middleware pendiente: `src/middleware.js` — proteger `/admin` (solo admin) y `/` (autenticado). Hasta que exista, las páginas deben hacer su propio redirect basado en `/api/me` o `/api/estado`.
- El sorteo **no** valida "todos listos" en el backend; el admin lo decide con el contador de `/api/estado` + `umbral_listos`.

## Seed (`scripts/seed.mjs`)

`npm run seed` con `ADMIN_NOMBRE` y `ADMIN_PASSWORD` en el entorno. Hace upsert de un admin sobre `nombre` y asegura la fila `config` (id=1).

## Tests

- `tests/sorteo.test.mjs` — 6 tests unitarios de `sorteo.js` (node:test, sin BD ni deps): mínimo 2 participantes, 2 participantes se intercambian, derangement sin vetos, veto respetado en ambos sentidos, veto total imposible, previos no se repiten. `npm test`.
- `tests/e2e.integration.mjs` — 5 tests de integración con `fetch` contra `next dev` y Supabase real: login, rate limit, `/api/me`, cambio de contraseña (revoca cookie vieja) y evento único (form + listo + veto + sortear + asignado + pregunta anónima + respuesta + segunda pregunta 409). Crea usuarios `e2e_*` y los borra al final; el test de evento único limpia residuales antes de sortear para aislar el sorteo. Requiere `npm run dev` y `E2E_*`. `npm run test:e2e`.

## Flujo completo

1. **Login** — `POST /api/login` valida con bcrypt (rate limit) y setea cookie JWT.
2. **Formulario** — el usuario hace `PATCH /api/me/form` con hobbies, tallas y palabra vetada (solo `abierto`).
3. **Listo** — `POST /api/me/listo` marca `estado = 'listo'`.
4. **Sorteo** — el admin pulsa sortear → `POST /api/admin/sortear` calcula el reparto (Kuhn con vetos + previos) y guarda `asignado_id`. Estado → `sorteado`.
5. **Reveal** — el usuario hace `GET /api/me/asignado` y ve el perfil de su receptor; `POST /api/me/viewed` marca la animación como vista.
6. **Pregunta anónima** — el usuario envía `POST /api/me/pregunta` (una sola). El receptor responde `POST /api/me/pregunta/respuesta` sin conocer el autor.

## Funcionalidades por rol (lógica actual)

**Usuario normal:**

- Iniciar/cerrar sesión.
- Rellenar hobbies/tallas/palabra vetada y marcar listo.
- Ver su asignado (perfil del receptor) cuando se sortea.
- Enviar una pregunta anónima y responder la que reciba.
- Cambiar su contraseña.
- Ver el estado global (polling).

**Admin (todo lo anterior más):**

- Crear usuarios (rol `user` o `admin`).
- Configurar el evento (`PATCH /api/config`).
- Gestionar vetos.
- Sortear / re-sortear.
- Ver contador de listos y estado global.

## Pendiente

- Middleware de protección de rutas (`/admin` solo admin, `/` autenticado).
- Páginas `login`, `/` (main), `admin`.
- Conexión del reveal con `POST /api/me/viewed`.
- Polling de estado en el cliente.
