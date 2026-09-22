import { NextResponse } from "next/server";
import { getUserWithHash, updatePassword } from "@/lib/db";
import {
  getSession,
  verifyPassword,
  hashPassword,
  signSession,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const actual = body?.actual ?? "";
  const nueva = body?.nueva ?? "";
  if (!actual || !nueva) {
    return NextResponse.json(
      { error: "Contraseña actual y nueva requeridas" },
      { status: 400 },
    );
  }

  const user = await getUserWithHash(session.sub);
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (!(await verifyPassword(actual, user.password_hash))) {
    return NextResponse.json(
      { error: "Contraseña actual incorrecta" },
      { status: 401 },
    );
  }

  const hash = await hashPassword(nueva);
  const newTokenVersion = (user.token_version ?? 0) + 1;
  await updatePassword(session.sub, hash, newTokenVersion);

  const token = await signSession({
    id: user.id,
    nombre: user.nombre,
    role: user.role,
    token_version: newTokenVersion,
  });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
