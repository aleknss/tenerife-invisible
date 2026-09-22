# NEXT.md — Roadmap y diseño

Documento de diseño para la siguiente fase. Refleja las decisiones tomadas y las pendientes. No hay código nuevo todavía.

## Estado de implementación (memoria de sesión)

### Decisiones cerradas

- **Privacidad = B**: servidor conoce el mapping (texto plano, `asignado_id`).
- **Evento único**: toda la app es el evento; una fila `config` (id=1).
- **Pregunta anónima**: receptor no ve autor; admin no ve preguntas ni respuestas.
- **Realtime = polling** (2-3 s).
- Menores: tallas fijas (camiseta, pantalon, zapato, gorro, guantes), umbral "todos listos", vetos solo admin, respuesta informativa, re-sorteo solo en `sorteado`.

### Hecho y testeado

- Cambio de contraseña `POST /api/me/password` (sube `token_version`, revoca sesiones). e2e ✅.
- `supabase/schema.sql` reescrito y **APLICADO** en Supabase: columnas `usuario` (`asignado_id`, `hobbies`, `tallas`, `palabra_vetada`, `estado`) + tablas `config`, `veto`, `pregunta`, `asignacion`. RLS activo sin políticas. Idempotente.
- `src/lib/sorteo.js`: sorteo bipartito (Kuhn aleatorio) con vetos + previos. Unit 6 ✅ (`npm test` = 15/15 con crypto).
- `src/lib/db.js`: funciones nuevas (config, participantes, vetos, asignaciones, preguntas).
- Rutas nuevas (9): `config`, `me/form`, `me/listo`, `admin/vetos`, `admin/sortear`, `estado`, `me/asignado`, `me/pregunta`, `me/pregunta/respuesta`.
- `scripts/seed.mjs` asegura fila `config` (id=1).

### Bug encontrado y corregido (importante)

- `upsert(..., { onConflict: "id" })` sobre `usuario` **inserta en vez de actualizar** → error `23502 null nombre` (probable causa: FK autorreferencial `asignado_id`). Corregido: `applySorteo` usa `update` por fila en bucle. **Ya no es atómico** → si importa, pasar a RPC de Postgres.

### En progreso / pendiente inmediato

- e2e nuevo `"evento único: sorteo con veto + pregunta anónima"` en `tests/e2e.integration.mjs`. Antes daba 500 por el bug del upsert; ya corregido. **Falta re-ejecutar `npm run test:e2e` para confirmar 9/9** (última corrida fue abortada tras `cambio de contraseña`).

### Siguiente (orden)

1. Re-ejecutar `npm run test:e2e` → confirmar sortear + verificar limpieza de BD.
2. Middleware `src/middleware.js`: protege `/admin` (solo admin) y `/` (autenticado).
3. Páginas: `login`, main `/` (estado + form hobbies/tallas/palabra + botón listo + reveal animado + pregunta/respuesta), `admin` (reglas config, vetos, contador listos, botón sortear).
4. Reveal: marcar `viewed_at` al ver (reutiliza `POST /api/me/viewed` existente).
5. Retirar legacy sealed box si se abandona A: `/api/randomize`, `usuario.usuario_asignado`, `crypto.js`/`keys.js` (opcional).
6. Actualizar `ARCHITECTURE.md`/`PLAN.md` al final.

### Cómo correr

- Unit (sin BD): `npm test`.
- e2e (requiere `npm run dev` en otra terminal + `.env.local` con `E2E_ADMIN_NOMBRE`/`E2E_ADMIN_PASSWORD`/`SUPABASE_*`): `npm run test:e2e`.

### Estado de BD (cuidado con secretos)

- Admin: nombre `admin`, password en `.env.local` (`E2E_ADMIN_PASSWORD`). Si el repo se comparte, cambiar password y rotar.
- `config.estado` actual: `abierto` (los tests lo restauran).
