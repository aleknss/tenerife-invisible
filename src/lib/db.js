// Server-only. Cliente Supabase con service role.
import { createClient } from "@supabase/supabase-js";

let client;

function getSupabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export async function getUserByNombre(nombre) {
  const { data, error } = await getSupabase()
    .from("usuario")
    .select("id, nombre, password_hash, role")
    .eq("nombre", nombre)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserById(id) {
  const { data, error } = await getSupabase()
    .from("usuario")
    .select("id, nombre, role, public_key, usuario_asignado, viewed_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createUser(nombre, passwordHash, role = "user") {
  const { data, error } = await getSupabase()
    .from("usuario")
    .insert({ nombre, password_hash: passwordHash, role })
    .select("id, nombre, role")
    .single();
  if (error) throw error;
  return data;
}

export async function listUsers(includePublicKey) {
  const columns = includePublicKey
    ? "id, nombre, role, public_key"
    : "id, nombre";
  const { data, error } = await getSupabase()
    .from("usuario")
    .select(columns)
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data;
}

export async function updatePublicKey(id, publicKey) {
  const { error } = await getSupabase()
    .from("usuario")
    .update({ public_key: publicKey })
    .eq("id", id);
  if (error) throw error;
}

export async function markViewed(id) {
  const { error } = await getSupabase()
    .from("usuario")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function applyAssignments(rows) {
  // rows: [{ user_id, ciphertext }]
  const supabase = getSupabase();
  for (const row of rows) {
    const { error } = await supabase
      .from("usuario")
      .update({ usuario_asignado: row.ciphertext, viewed_at: null })
      .eq("id", row.user_id);
    if (error) throw error;
  }
}
