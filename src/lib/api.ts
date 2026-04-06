import { API_BASE } from "./config.ts";
import { getAccessToken } from "./auth.ts";
import type { components, operations } from "../generated/parqet.d.ts";

export class AuthError extends Error {
  constructor() {
    super("Not authenticated. Run: parqet auth login");
    this.name = "AuthError";
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = process.env["PARQET_TOKEN"] ?? (await getAccessToken());
  if (!token) throw new AuthError();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401 || res.status === 403) throw new AuthError();
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, `API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// --- Convenience aliases from generated types ---

export type UserInfo = components["schemas"]["ConnectInfoDto_Output"];
export type Portfolio = components["schemas"]["PortfolioListResponseDto_Output"]["items"][0];
export type PerformanceBody = components["schemas"]["PortfolioPerformanceBodyDto"];
export type PerformanceResponse = components["schemas"]["PortfolioPerformanceDto_Output"];
export type Holding = PerformanceResponse["holdings"][0];
export type PerformanceSummary = PerformanceResponse["performance"];
export type Timeframe = Extract<
  PerformanceBody["interval"],
  { type: "relative" }
>["value"];

export type ActivitiesResponse =
  operations["activities_retrieve"]["responses"]["200"]["content"]["application/json"];

// --- API methods ---

export const api = {
  async user(): Promise<UserInfo> {
    return request<UserInfo>("/user");
  },

  async portfolios(): Promise<Portfolio[]> {
    const res = await request<components["schemas"]["PortfolioListResponseDto_Output"]>("/portfolios");
    return res.items;
  },

  async performance(portfolioIds: string[], timeframe: Timeframe = "ytd"): Promise<PerformanceResponse> {
    return request<PerformanceResponse>("/performance", {
      method: "POST",
      body: JSON.stringify({
        portfolioIds,
        interval: { type: "relative", value: timeframe },
      } satisfies PerformanceBody),
    });
  },

  async activities(
    portfolioId: string,
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<ActivitiesResponse> {
    const params = new URLSearchParams();
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.cursor) params.set("cursor", opts.cursor);
    const qs = params.toString() ? `?${params}` : "";
    return request<ActivitiesResponse>(`/portfolios/${portfolioId}/activities${qs}`);
  },
};
