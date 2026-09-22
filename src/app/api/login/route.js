import { NextResponse } from "next/server";
import {
  getUserByNombre,
  countLoginAttempts,
  recordLoginAttempt,
  clearLoginAttempts,
} from "@/lib/db";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const nombre = (body.nombre ?? "").trim();
  const password = body.password ?? "";

  if (!nombre || !password) {
    return NextResponse.json(
      { error: "Nombre y contraseña requeridos" },
      { status: 400 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const attempts = await countLoginAttempts(nombre, ip, since);
  if (attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Demasiados intentos. Prueba más tarde." },
      { status: 429 },
    );
  }

  const user = await getUserByNombre(nombre);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await recordLoginAttempt(
      nombre,
      ip,
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    );
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  await clearLoginAttempts(nombre, ip);
  const token = await signSession(user);
  await setSessionCookie(token);
  return NextResponse.json({ role: user.role, nombre: user.nombre });
}
