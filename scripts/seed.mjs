// Crea o actualiza el primer admin. Uso:
//   ADMIN_NOMBRE=admin ADMIN_PASSWORD=xxx npm run seed
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const nombre = process.env.ADMIN_NOMBRE;
const password = process.env.ADMIN_PASSWORD;

if (!url || !key || !nombre || !password) {
  console.error(
    "Faltan variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_NOMBRE, ADMIN_PASSWORD",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const hash = await bcrypt.hash(password, 10);

const { data, error } = await supabase
  .from("usuario")
  .upsert({ nombre, password_hash: hash, role: "admin" }, { onConflict: "nombre" })
  .select("id, nombre, role")
  .single();

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

console.log("Admin listo:", data);
