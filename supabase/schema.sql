-- Amigo invisible: tabla única.
-- Acceso solo con service role desde el servidor. Sin RLS.

create table if not exists usuario (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  password_hash text not null,
  public_key text,          -- base64, 32 bytes, null hasta el primer login
  role text not null default 'user',   -- 'user' | 'admin'
  usuario_asignado text,    -- base64 ciphertext (sealed box), null hasta el sorteo
  viewed_at timestamptz,    -- null hasta que ve la animación
  created_at timestamptz not null default now()
);
