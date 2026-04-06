import { API_BASE } from "./config.ts";
import { getAccessToken } from "./auth.ts";

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
  const token = await getAccessToken();
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

  if (res.status === 401) throw new AuthError();

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, `API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// --- Types ---

export interface Portfolio {
  id: string;
  name: string;
  currency: string;
  value?: number;
}

export interface Holding {
  id: string;
  name: string;
  isin?: string;
  quantity: number;
  currentValue: number;
  purchaseValue: number;
  gainLoss: number;
  gainLossPercent: number;
  currency: string;
}

export interface Performance {
  portfolioValue: number;
  unrealized: { gainGross: number; returnGross: number };
  dividends?: { gainNet: number };
  timeframe: string;
}

// --- API methods ---

export const api = {
  async portfolios(): Promise<Portfolio[]> {
    return request<Portfolio[]>("/v1/portfolios");
  },

  async portfolio(id: string, timeframe = "ytd"): Promise<{ portfolio: Portfolio; performance: Performance }> {
    return request(`/v1/portfolios/${id}?timeframe=${timeframe}&useInclude=true`);
  },

  async holdings(portfolioId: string): Promise<Holding[]> {
    return request<Holding[]>(`/v1/portfolios/${portfolioId}/holdings`);
  },
};
