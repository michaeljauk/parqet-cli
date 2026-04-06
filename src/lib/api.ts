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
  const token =
    process.env["PARQET_TOKEN"] ?? (await getAccessToken());
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

// --- Types ---

export interface Portfolio {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  distinctBrokers: string[];
}

export type Timeframe =
  | "1d" | "1w" | "mtd" | "1m" | "3m" | "6m"
  | "1y" | "ytd" | "3y" | "5y" | "10y" | "max";

export interface PerformanceSummary {
  valuation: {
    atIntervalStart: number;
    atIntervalEnd: number;
  };
  unrealizedGains: {
    inInterval: {
      gainGross: number;
      gainNet: number;
      returnGross: number;
      returnNet: number;
    };
  };
  realizedGains: Record<string, unknown>;
  dividends: unknown;
  fees: Record<string, unknown>;
  taxes: Record<string, unknown>;
  kpis?: {
    inInterval?: {
      xirr?: number | null;
      ttwror?: number | null;
    };
  };
}

export interface HoldingAsset {
  name?: string;
  isin?: string;
  symbol?: string;
  type?: string;
}

export interface HoldingPosition {
  shares: number;
  purchasePrice: number;
  purchaseValue: number;
  currentPrice: number;
  currentValue: number;
  isSold: boolean;
}

export interface Holding {
  id: string;
  activityCount: number;
  asset?: HoldingAsset;
  nickname?: string;
  position: HoldingPosition;
  performance: PerformanceSummary;
}

export interface PerformanceResponse {
  performance: PerformanceSummary;
  holdings: Holding[];
  interval: { type: string; value?: string; start?: string; end?: string };
}

export interface UserInfo {
  userId: string;
  installationId: string;
  state: "active" | "deleted";
  permissions: Array<{ action: "read" | "write"; resourceType: string; resourceId: string }>;
}

// --- API methods ---

export const api = {
  async user(): Promise<UserInfo> {
    return request<UserInfo>("/user");
  },

  async portfolios(): Promise<Portfolio[]> {
    const res = await request<{ items: Portfolio[] }>("/portfolios");
    return res.items;
  },

  async performance(portfolioIds: string[], timeframe: Timeframe = "ytd"): Promise<PerformanceResponse> {
    return request<PerformanceResponse>("/performance", {
      method: "POST",
      body: JSON.stringify({
        portfolioIds,
        interval: { type: "relative", value: timeframe },
      }),
    });
  },

  async activities(
    portfolioId: string,
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<{ activities: unknown[]; cursor?: string }> {
    const params = new URLSearchParams();
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.cursor) params.set("cursor", opts.cursor);
    const qs = params.toString() ? `?${params}` : "";
    return request(`/portfolios/${portfolioId}/activities${qs}`);
  },
};
