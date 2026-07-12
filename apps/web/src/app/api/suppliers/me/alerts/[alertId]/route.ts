import { NextResponse } from "next/server";
import { getAuthHeader } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ alertId: string }> },
) {
  const { alertId } = await params;

  const res = await apiFetch(`/suppliers/me/alerts/${alertId}`, {
    method: "DELETE",
    headers: await getAuthHeader(),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
