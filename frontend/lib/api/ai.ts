import { apiFetch } from "./client";

export const aiApi = {
  suggestReplies: async (payload: unknown, token?: string) =>
    (await apiFetch("/ai/suggest", token, { method: "POST", body: JSON.stringify(payload) })).json(),
};
