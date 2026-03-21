import { apiFetch } from "./client";

export const membershipsApi = {
  list: async (token?: string) => (await apiFetch("/memberships", token)).json(),
  create: async (payload: unknown, token?: string) =>
    (await apiFetch("/memberships", token, { method: "POST", body: JSON.stringify(payload) })).json(),
  update: async (payload: unknown, token?: string) =>
    (await apiFetch("/memberships", token, { method: "PATCH", body: JSON.stringify(payload) })).json(),
};
