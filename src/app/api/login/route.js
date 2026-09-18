import { NextResponse } from "next/server";
import { getUserByNombre } from "@/lib/db";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";

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

  const user = await getUserByNombre(nombre);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const token = await signSession(user);
  await setSessionCookie(token);
  return NextResponse.json({ role: user.role, nombre: user.nombre });
}
