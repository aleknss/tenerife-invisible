-- Amigo invisible: evento único.
-- Acceso solo con service role desde el servidor. RLS activo, sin políticas.

create table if not exists usuario (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  password_hash text not null,
  role text not null default 'user',   -- 'user' | 'admin'
  asignado_id uuid references usuario(id),  -- receptor en claro (B), null hasta el sorteo
  hobbies text,             -- 3 cosas
  tallas jsonb,             -- { camiseta, pantalon, zapato, ... }
  palabra_vetada text,      -- objeto no deseado
  estado text not null default 'pendiente',  -- 'pendiente' | 'listo'
  viewed_at timestamptz,    -- null hasta que ve la animación
  token_version integer not null default 0,
  created_at timestamptz not null default now()
);

-- Migración idempotente para BD ya creadas:
alter table usuario add column if not exists asignado_id uuid references usuario(id);
alter table usuario add column if not exists hobbies text;
alter table usuario add column if not exists tallas jsonb;
alter table usuario add column if not exists palabra_vetada text;
alter table usuario add column if not exists estado text not null default 'pendiente';

-- Retirada de columnas legacy (opción A / sealed box).
alter table usuario drop column if exists public_key;
alter table usuario drop column if exists usuario_asignado;

do $$ begin
  alter table usuario add constraint usuario_role_check check (role in ('user','admin'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table usuario add constraint usuario_estado_check check (estado in ('pendiente','listo'));
exception when duplicate_object then null;
end $$;

-- Configuración única del evento (una sola fila, id = 1).
create table if not exists config (
  id int primary key default 1 check (id = 1),
  nombre text,
  precio numeric,
  moneda text not null default 'EUR',
  fecha_entrega date,
  tematica text,
  metodo_entrega text,                -- presencial / online / correo / ...
  invisible_real boolean not null default true,
  reglas text,                        -- texto libre
  umbral_listos integer,              -- nº de "listos" para habilitar el sorteo
  estado text not null default 'abierto',  -- abierto | sorteado | revelado | cerrado
  created_at timestamptz not null default now()
);

do $$ begin
  alter table config add constraint config_estado_check check (estado in ('abierto','sorteado','revelado','cerrado'));
exception when duplicate_object then null;
end $$;

-- Parejas vetadas (normalizar a_id < b_id en la app).
create table if not exists veto (
  id bigint generated always as identity primary key,
  a_id uuid not null references usuario(id),
  b_id uuid not null references usuario(id),
  unique (a_id, b_id)
);

-- Una pregunta por usuario, anónima para el receptor.
create table if not exists pregunta (
  id bigint generated always as identity primary key,
  autor_id uuid not null references usuario(id),
  destinatario_id uuid not null references usuario(id),
  texto text not null,
  respuesta text,
  respondida_at timestamptz,
  created_at timestamptz not null default now(),
  unique (autor_id)
);

-- Historial de asignaciones (para "no repetir el año pasado").
create table if not exists asignacion (
  id bigint generated always as identity primary key,
  anio integer not null default extract(year from now())::int,
  dador_id uuid not null references usuario(id),
  receptor_id uuid not null references usuario(id),
  created_at timestamptz not null default now(),
  unique (anio, dador_id),
  unique (anio, receptor_id)
);

-- Rate limit de login.
create table if not exists login_attempt (
  id bigint generated always as identity primary key,
  nombre text not null,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists login_attempt_lookup
  on login_attempt (nombre, ip, created_at);

-- RLS activo y sin políticas: anon/authenticated quedan denegados. service_role bypassa RLS.
alter table usuario enable row level security;
alter table config enable row level security;
alter table veto enable row level security;
alter table pregunta enable row level security;
alter table asignacion enable row level security;
alter table login_attempt enable row level security;
