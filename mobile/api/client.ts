import Constants from "expo-constants";

import type {
  Holding,
  HoldingCreate,
  Portfolio,
  PortfolioHistory,
  RangeKey,
  SearchItem,
} from "./types";

// Resolution order: EXPO_PUBLIC_API_URL env var -> app.json extra.apiUrl -> localhost.
// On a physical device replace localhost with your machine's LAN IP (see README).
const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:8123";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  baseUrl: API_URL,

  getPortfolio: () => request<Portfolio>("/portfolio"),

  getHistory: (range: RangeKey) =>
    request<PortfolioHistory>(`/portfolio/history?range=${range}`),

  listHoldings: () => request<Holding[]>("/holdings"),

  createHolding: (payload: HoldingCreate) =>
    request<Holding>("/holdings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteHolding: (id: number) =>
    request<void>(`/holdings/${id}`, { method: "DELETE" }),

  search: (q: string, type: "us" | "in_mf") =>
    request<SearchItem[]>(`/search?q=${encodeURIComponent(q)}&type=${type}`),

  refresh: () => request<{ status: string }>("/portfolio/refresh", { method: "POST" }),
};
