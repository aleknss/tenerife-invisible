import { NextResponse } from "next/server";
import { updatePublicKey, getUserById } from "@/lib/db";
import { getSession } from "@/lib/auth";

function isValidPublicKey(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return false;
  }
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

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

  const publicKey = body?.public_key;
  if (!isValidPublicKey(publicKey)) {
    return NextResponse.json({ error: "public_key inválida" }, { status: 400 });
  }

  const user = await getUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (user.public_key && user.public_key !== publicKey && !body?.force) {
    return NextResponse.json(
      {
        error: "La cuenta ya tiene una clave; se perdería el asignado actual",
        code: "PUBLIC_KEY_EXISTS",
      },
      { status: 409 },
    );
  }

  await updatePublicKey(session.sub, publicKey);
  return NextResponse.json({ ok: true });
}
