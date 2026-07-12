import { redirect } from "next/navigation";
import { getAuthHeader } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { Supplier } from "@/lib/suppliers";

async function requireOk(res: Response, failureMessage: string): Promise<Response> {
  if (res.status === 401) {
    // Session cookie no longer maps to a valid account (expired, deleted,
    // or — in dev — the DB was reseeded after the token was issued).
    // Route through /api/auth/invalidate so the stale cookie is actually
    // cleared — redirecting straight to /login here would leave the cookie
    // in place and the middleware would just bounce back to "/".
    redirect("/api/auth/invalidate");
  }
  if (!res.ok) {
    throw new Error(`${failureMessage}: ${res.status} ${res.statusText}`);
  }
  return res;
}

export async function getSuppliers(): Promise<Supplier[]> {
  const res = await apiFetch("/suppliers", {
    cache: "no-store",
    headers: await getAuthHeader(),
  });
  await requireOk(res, "Failed to load suppliers");
  return res.json();
}

export async function getMySupplier(): Promise<Supplier> {
  const res = await apiFetch("/suppliers/me", {
    cache: "no-store",
    headers: await getAuthHeader(),
  });
  await requireOk(res, "Failed to load your facility");
  return res.json();
}
