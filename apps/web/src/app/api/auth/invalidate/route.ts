import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

/**
 * Clears a stale session cookie (one that no longer maps to a valid account)
 * and redirects to login. A plain redirect("/login") from a Server Component
 * can't clear cookies, so the cookie would survive and the middleware would
 * immediately bounce the user back — this route breaks that loop.
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
