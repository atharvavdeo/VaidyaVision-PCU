import { apiFetch } from "./client";

export const notificationsApi = {
  list: async (token?: string) => (await apiFetch("/notifications", token)).json(),
  markAllRead: async (token?: string) =>
    (await apiFetch("/notifications", token, { method: "PATCH" })).json(),
};
