import { NextResponse } from "next/server";
import { getUserById } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await getUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const { id, nombre, role, viewed_at } = user;
  return NextResponse.json({ id, nombre, role, viewed_at });
}
