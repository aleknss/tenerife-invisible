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
    .select("id, nombre, password_hash, role, token_version")
    .eq("nombre", nombre)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserById(id) {
  const { data, error } = await getSupabase()
    .from("usuario")
    .select("id, nombre, role, public_key, usuario_asignado, viewed_at, token_version")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserWithHash(id) {
  const { data, error } = await getSupabase()
    .from("usuario")
    .select("id, nombre, role, password_hash, token_version")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updatePassword(id, passwordHash, tokenVersion) {
  const { error } = await getSupabase()
    .from("usuario")
    .update({ password_hash: passwordHash, token_version: tokenVersion })
    .eq("id", id);
  if (error) throw error;
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
  const payload = rows.map((row) => ({
    id: row.user_id,
    usuario_asignado: row.ciphertext,
    viewed_at: null,
  }));
  const { error } = await getSupabase()
    .from("usuario")
    .upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function countLoginAttempts(nombre, ip, sinceIso) {
  const { count, error } = await getSupabase()
    .from("login_attempt")
    .select("id", { count: "exact", head: true })
    .eq("nombre", nombre)
    .eq("ip", ip)
    .gte("created_at", sinceIso);
  if (error) throw error;
  return count ?? 0;
}

export async function recordLoginAttempt(nombre, ip, cutoffIso) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("login_attempt")
    .insert({ nombre, ip });
  if (error) throw error;
  await supabase.from("login_attempt").delete().lt("created_at", cutoffIso);
}

export async function clearLoginAttempts(nombre, ip) {
  const { error } = await getSupabase()
    .from("login_attempt")
    .delete()
    .eq("nombre", nombre)
    .eq("ip", ip);
  if (error) throw error;
}

// --- Configuración del evento (fila única id=1) ---

export async function getConfig() {
  const { data, error } = await getSupabase()
    .from("config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateConfig(fields) {
  const { data, error } = await getSupabase()
    .from("config")
    .update(fields)
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// --- Participantes ---

export async function listParticipants() {
  const { data, error } = await getSupabase()
    .from("usuario")
    .select(
      "id, nombre, role, estado, asignado_id, hobbies, tallas, palabra_vetada, viewed_at",
    )
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getUserState(id) {
  const { data, error } = await getSupabase()
    .from("usuario")
    .select("estado, asignado_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setParticipantForm(id, fields) {
  const allowed = {};
  for (const k of ["hobbies", "tallas", "palabra_vetada"]) {
    if (k in fields) allowed[k] = fields[k];
  }
  const { error } = await getSupabase()
    .from("usuario")
    .update(allowed)
    .eq("id", id);
  if (error) throw error;
}

export async function setListo(id) {
  const { error } = await getSupabase()
    .from("usuario")
    .update({ estado: "listo" })
    .eq("id", id);
  if (error) throw error;
}

// --- Vetos ---

export async function listVetos() {
  const { data, error } = await getSupabase().from("veto").select("a_id, b_id");
  if (error) throw error;
  return data.map((v) => [v.a_id, v.b_id]);
}

export async function addVeto(aId, bId) {
  const [a, b] = aId < bId ? [aId, bId] : [bId, aId];
  const { error } = await getSupabase().from("veto").insert({ a_id: a, b_id: b });
  if (error) throw error;
}

export async function removeVeto(aId, bId) {
  const [a, b] = aId < bId ? [aId, bId] : [bId, aId];
  const { error } = await getSupabase()
    .from("veto")
    .delete()
    .eq("a_id", a)
    .eq("b_id", b);
  if (error) throw error;
}

// --- Asignaciones ---

export async function getPrevios(anio) {
  const { data, error } = await getSupabase()
    .from("asignacion")
    .select("dador_id, receptor_id")
    .eq("anio", anio);
  if (error) throw error;
  return data.map((r) => [r.dador_id, r.receptor_id]);
}

export async function applySorteo(mapping, anio) {
  const supabase = getSupabase();

  for (const [dadorId, receptorId] of mapping) {
    const { error } = await supabase
      .from("usuario")
      .update({ asignado_id: receptorId, viewed_at: null })
      .eq("id", dadorId);
    if (error) throw error;
  }

  const { error: del } = await supabase.from("asignacion").delete().eq("anio", anio);
  if (del) throw del;

  const historial = [...mapping.entries()].map(([dadorId, receptorId]) => ({
    anio,
    dador_id: dadorId,
    receptor_id: receptorId,
  }));
  const { error: ins } = await supabase.from("asignacion").insert(historial);
  if (ins) throw ins;
}

export async function getReceptorProfile(dadorId) {
  const { data: dador } = await getSupabase()
    .from("usuario")
    .select("asignado_id, viewed_at")
    .eq("id", dadorId)
    .maybeSingle();
  if (!dador || !dador.asignado_id) return null;

  const { data: receptor } = await getSupabase()
    .from("usuario")
    .select("id, nombre, hobbies, tallas, palabra_vetada")
    .eq("id", dador.asignado_id)
    .maybeSingle();
  return { receptor, viewed_at: dador.viewed_at };
}

// --- Preguntas ---

export async function getPreguntaEnviada(autorId) {
  const { data, error } = await getSupabase()
    .from("pregunta")
    .select("id, texto, respuesta, respondida_at")
    .eq("autor_id", autorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPreguntaRecibida(destinatarioId) {
  const { data, error } = await getSupabase()
    .from("pregunta")
    .select("id, texto, respondida_at")
    .eq("destinatario_id", destinatarioId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPregunta(autorId, destinatarioId, texto) {
  const { error } = await getSupabase()
    .from("pregunta")
    .insert({ autor_id: autorId, destinatario_id: destinatarioId, texto });
  if (error) throw error;
}

export async function responderPregunta(preguntaId, destinatarioId, respuesta) {
  const { data, error } = await getSupabase()
    .from("pregunta")
    .update({ respuesta, respondida_at: new Date().toISOString() })
    .eq("id", preguntaId)
    .eq("destinatario_id", destinatarioId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data;
}
