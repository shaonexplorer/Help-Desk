import { apiClient } from "@/lib/api-client";

export interface HelloResponse {
  message: string;
}

/** Ping the server's health probe. Requires an authenticated session. */
export async function fetchHello(): Promise<HelloResponse> {
  const { data } = await apiClient.get<HelloResponse>("/api/hello");
  return data;
}
