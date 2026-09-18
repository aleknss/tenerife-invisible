import { NextResponse } from "next/server";
import { markViewed } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await markViewed(session.sub);
  return NextResponse.json({ ok: true });
}
