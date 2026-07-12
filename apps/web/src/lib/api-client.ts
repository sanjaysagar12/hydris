const API_URL = process.env.API_URL ?? "http://localhost:3333/api";

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, init);
}
