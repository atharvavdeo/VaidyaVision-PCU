import { apiFetch } from "./client";

export const hospitalsApi = {
  list: async (token?: string) => (await apiFetch("/hospitals", token)).json(),
  listPatients: async (hospitalId: number, query?: string, token?: string) => {
    const search = query ? `?query=${encodeURIComponent(query)}` : "";
    return (await apiFetch(`/hospitals/${hospitalId}/patients${search}`, token)).json();
  },
};
