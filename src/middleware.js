import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

export async function middleware(req) {
  const token = req.cookies.get("session")?.value;

  let valido = false;
  if (token) {
    try {
      await jwtVerify(token, getSecret());
      valido = true;
    } catch {
      valido = false;
    }
  }

  if (!valido) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/perfil/:path*", "/grupo/:path*", "/regalo/:path*", "/admin/:path*"],
};
