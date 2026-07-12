import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await apiFetch("/copilot/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
