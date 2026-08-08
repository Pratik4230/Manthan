import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)
  const { pathname } = request.nextUrl

  if (
    (pathname.startsWith("/workspaces") || pathname.startsWith("/profile")) &&
    !sessionCookie
  ) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (
    sessionCookie &&
    (pathname === "/login" || pathname === "/signup")
  ) {
    return NextResponse.redirect(new URL("/workspaces", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/workspaces/:path*", "/profile", "/login", "/signup"],
}
