import { apiFetch } from "./client";

export const appointmentsApi = {
  list: async (token?: string) => (await apiFetch("/appointments", token)).json(),
  create: async (payload: unknown, token?: string) =>
    (await apiFetch("/appointments", token, { method: "POST", body: JSON.stringify(payload) })).json(),
  update: async (payload: unknown, token?: string) =>
    (await apiFetch("/appointments", token, { method: "PATCH", body: JSON.stringify(payload) })).json(),
};
