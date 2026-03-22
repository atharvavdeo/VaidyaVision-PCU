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

export const reportsApi = {
  list: async (params?: Record<string, QueryValue>, token?: string) =>
    (await apiFetch(`/reports${buildQuery(params)}`, token)).json(),
  get: async (id: number | string, token?: string) => (await apiFetch(`/reports/${id}`, token)).json(),
};
