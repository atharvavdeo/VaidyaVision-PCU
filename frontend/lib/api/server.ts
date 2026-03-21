import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "./client";

export async function serverFetch(path: string, options: RequestInit = {}) {
  const { getToken } = await auth();
  const token = await getToken();
  return apiFetch(path, token, options);
}
