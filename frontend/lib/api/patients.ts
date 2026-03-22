import { apiFetch } from "./client";

export const patientsApi = {
  hospitals: async (token?: string) => (await apiFetch("/patients/hospitals", token)).json(),
};
