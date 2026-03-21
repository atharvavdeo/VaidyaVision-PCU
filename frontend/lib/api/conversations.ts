import { apiFetch } from "./client";

export const conversationsApi = {
  list: async (token?: string) => (await apiFetch("/conversations", token)).json(),
  listMessages: async (conversationId: number, token?: string) =>
    (await apiFetch(`/conversations/${conversationId}/messages`, token)).json(),
  sendMessage: async (conversationId: number, payload: unknown, token?: string) =>
    (
      await apiFetch(`/conversations/${conversationId}/messages`, token, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ).json(),
};
