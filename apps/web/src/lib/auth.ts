import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "./session-cookie";

export { SESSION_COOKIE };

export type Role = "ADMIN" | "SUPPLIER";

export interface Session {
  sub: string;
  email: string;
  role: Role;
}

function decodeJwt(token: string): Session | null {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeJwt(token);
}

export async function getAuthHeader(): Promise<Record<string, string>> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Sets the httpOnly session cookie on a Next.js route handler response. */
export function withSessionCookie(response: NextResponse, accessToken: string) {
  response.cookies.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
