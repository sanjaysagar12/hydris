import { NextRequest, NextResponse } from "next/server";
import { withSessionCookie } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  return withSessionCookie(NextResponse.json({ user: data.user }), data.accessToken);
}
