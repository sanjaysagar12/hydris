import { NextRequest, NextResponse } from "next/server";
import { getAuthHeader } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

/**
 * Forwards the multipart upload straight through as a stream rather than
 * re-parsing it with request.formData() and rebuilding a new FormData —
 * simpler, and avoids re-encoding potentially large file payloads twice.
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type");
  if (!contentType) {
    return NextResponse.json({ message: "Missing content-type" }, { status: 400 });
  }

  const res = await apiFetch("/documents/extract", {
    method: "POST",
    headers: { "Content-Type": contentType, ...(await getAuthHeader()) },
    body: request.body,
    // @ts-expect-error -- duplex is required by undici for streaming request bodies, not yet in the TS lib types
    duplex: "half",
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
