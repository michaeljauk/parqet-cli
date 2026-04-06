import { Command } from "commander";
import { api, AuthError, ApiError, type Timeframe } from "../lib/api.ts";
import { print, error } from "../lib/output.ts";
import { getOutputFormat } from "../lib/config.ts";

function handleError(err: unknown): never {
  if (err instanceof AuthError) { error(err.message); process.exit(2); }
  if (err instanceof ApiError) { error(err.message); process.exit(1); }
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

export function registerPortfolioCommands(program: Command): void {
  const portfolio = program.command("portfolio").description("Portfolio operations");

  portfolio
    .command("list")
    .description("List all portfolios")
    .option("--output <format>", "Output format: table, json, markdown")
    .action(async (opts: { output?: string }) => {
      const format = getOutputFormat(opts.output);
      try {
        const portfolios = await api.portfolios();
        print(
          portfolios.map((p) => ({ id: p.id, name: p.name, currency: p.currency, brokers: p.distinctBrokers.join(", ") || "-" })),
          format,
          [
            { key: "id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "currency", label: "Currency" },
            { key: "brokers", label: "Brokers" },
          ]
        );
      } catch (err) { handleError(err); }
    });

  portfolio
    .command("show <id>")
    .description("Show portfolio performance")
    .option("--timeframe <tf>", "Timeframe: 1d,1w,mtd,1m,3m,6m,1y,ytd,3y,5y,10y,max", "ytd")
    .option("--output <format>", "Output format: table, json, markdown")
    .action(async (id: string, opts: { timeframe?: string; output?: string }) => {
      const format = getOutputFormat(opts.output);
      try {
        const { performance } = await api.performance([id], (opts.timeframe ?? "ytd") as Timeframe);
        const portfolios = await api.portfolios();
        const p = portfolios.find((x) => x.id === id);
        const currency = p?.currency ?? "EUR";

        if (format === "json") {
          print({ portfolio: p, performance }, "json");
          return;
        }

        const ug = performance.unrealizedGains.inInterval;
        const rows = [
          { metric: "Portfolio Value", value: fmt(performance.valuation.atIntervalEnd, currency) },
          { metric: "Start Value", value: fmt(performance.valuation.atIntervalStart, currency) },
          { metric: "Unrealized Gain (gross)", value: fmt(ug.gainGross, currency) },
          { metric: "Return (gross)", value: pct(ug.returnGross) },
          { metric: "Return (net)", value: pct(ug.returnNet) },
          ...(performance.kpis?.inInterval?.ttwror != null
            ? [{ metric: "TWR", value: pct(performance.kpis.inInterval.ttwror) }]
            : []),
          { metric: "Timeframe", value: opts.timeframe ?? "ytd" },
        ];
        print(rows, format, [
          { key: "metric", label: "Metric" },
          { key: "value", label: "Value", align: "right" },
        ]);
      } catch (err) { handleError(err); }
    });

  portfolio
    .command("holdings <id>")
    .description("List holdings in a portfolio")
    .option("--timeframe <tf>", "Timeframe: 1d,1w,mtd,1m,3m,6m,1y,ytd,3y,5y,10y,max", "ytd")
    .option("--output <format>", "Output format: table, json, markdown")
    .action(async (id: string, opts: { timeframe?: string; output?: string }) => {
      const format = getOutputFormat(opts.output);
      try {
        const { holdings } = await api.performance([id], (opts.timeframe ?? "ytd") as Timeframe);
        const portfolios = await api.portfolios();
        const currency = portfolios.find((x) => x.id === id)?.currency ?? "EUR";

        const rows = holdings
          .filter((h) => !h.position.isSold)
          .sort((a, b) => b.position.currentValue - a.position.currentValue)
          .map((h) => ({
            name: assetName(h) ?? h.nickname ?? h.id,
            isin: assetIsin(h) ?? "-",
            shares: h.position.shares,
            value: fmt(h.position.currentValue, currency),
            gain: fmt(h.performance.unrealizedGains.inInterval.gainGross, currency),
            "return%": pct(h.performance.unrealizedGains.inInterval.returnGross),
          }));

        print(rows, format, [
          { key: "name", label: "Name" },
          { key: "isin", label: "ISIN" },
          { key: "shares", label: "Shares", align: "right" },
          { key: "value", label: "Value", align: "right" },
          { key: "gain", label: "Gain/Loss", align: "right" },
          { key: "return%", label: "Return", align: "right" },
        ]);
      } catch (err) { handleError(err); }
    });

  portfolio
    .command("activities <id>")
    .description("List recent portfolio activities")
    .option("--limit <n>", "Number of activities to fetch (max 500)", "20")
    .option("--output <format>", "Output format: table, json, markdown")
    .action(async (id: string, opts: { limit?: string; output?: string }) => {
      const format = getOutputFormat(opts.output);
      try {
        const { activities } = await api.activities(id, { limit: Number(opts.limit ?? 20) });
        print(activities, format);
      } catch (err) { handleError(err); }
    });
}

import type { Holding } from "../lib/api.ts";
import { pct, fmt } from "../lib/format.ts";

function assetName(h: Holding): string | undefined {
  if (!h.asset) return undefined;
  if (h.asset.type === "cash") return "Cash";
  return "name" in h.asset ? h.asset.name : undefined;
}

function assetIsin(h: Holding): string | undefined {
  if (!h.asset) return undefined;
  return "isin" in h.asset ? h.asset.isin : undefined;
}

