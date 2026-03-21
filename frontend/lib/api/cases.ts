import { apiFetch } from "./client";

type QueryValue = string | number | boolean | null | undefined;

function buildQuery(params?: Record<string, QueryValue>) {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      sp.set(key, String(value));
    }
  }
  const query = sp.toString();
  return query ? `?${query}` : "";
}

export const casesApi = {
  list: async (params?: Record<string, QueryValue>, token?: string) =>
    (await apiFetch(`/cases${buildQuery(params)}`, token)).json(),
  create: async (payload: unknown, token?: string) =>
    (await apiFetch("/cases", token, { method: "POST", body: JSON.stringify(payload) })).json(),
  get: async (id: number, token?: string) => (await apiFetch(`/cases/${id}`, token)).json(),
  update: async (id: number, payload: unknown, token?: string) =>
    (await apiFetch(`/cases/${id}`, token, { method: "PATCH", body: JSON.stringify(payload) })).json(),
};
