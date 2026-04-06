import { Command } from "commander";
import { api, AuthError, ApiError } from "../lib/api.ts";
import { print, error } from "../lib/output.ts";
import { getOutputFormat } from "../lib/config.ts";

function handleError(err: unknown): never {
  if (err instanceof AuthError) {
    error(err.message);
    process.exit(2);
  }
  if (err instanceof ApiError) {
    error(err.message);
    process.exit(1);
  }
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

export function registerPortfolioCommands(program: Command): void {
  const portfolio = program.command("portfolio").description("Portfolio operations");

  portfolio
    .command("list")
    .description("List all portfolios")
    .option("--output <format>", "Output format: table, json, markdown", "table")
    .action(async (opts: { output?: string }) => {
      const format = getOutputFormat(opts.output);
      try {
        const portfolios = await api.portfolios();
        print(
          portfolios,
          format,
          [
            { key: "id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "currency", label: "Currency" },
          ]
        );
      } catch (err) {
        handleError(err);
      }
    });

  portfolio
    .command("show <id>")
    .description("Show portfolio value and performance")
    .option("--timeframe <tf>", "Timeframe: today, 7d, mtd, ytd, 1y, 3y, 5y, max", "ytd")
    .option("--output <format>", "Output format: table, json, markdown", "table")
    .action(async (id: string, opts: { timeframe?: string; output?: string }) => {
      const format = getOutputFormat(opts.output);
      try {
        const data = await api.portfolio(id, opts.timeframe ?? "ytd");
        if (format === "json") {
          print(data, "json");
        } else {
          const rows = [
            { metric: "Portfolio Value", value: formatCurrency(data.performance.portfolioValue, data.portfolio.currency) },
            { metric: "Unrealized Gain", value: formatCurrency(data.performance.unrealized.gainGross, data.portfolio.currency) },
            { metric: "Return (gross)", value: formatPercent(data.performance.unrealized.returnGross) },
            ...(data.performance.dividends
              ? [{ metric: "Dividends (net)", value: formatCurrency(data.performance.dividends.gainNet, data.portfolio.currency) }]
              : []),
            { metric: "Timeframe", value: opts.timeframe ?? "ytd" },
          ];
          print(rows, format, [
            { key: "metric", label: "Metric" },
            { key: "value", label: "Value", align: "right" },
          ]);
        }
      } catch (err) {
        handleError(err);
      }
    });

  portfolio
    .command("holdings <id>")
    .description("List holdings in a portfolio")
    .option("--output <format>", "Output format: table, json, markdown", "table")
    .action(async (id: string, opts: { output?: string }) => {
      const format = getOutputFormat(opts.output);
      try {
        const holdings = await api.holdings(id);
        print(
          holdings.map((h) => ({
            name: h.name,
            isin: h.isin ?? "-",
            qty: h.quantity,
            value: formatCurrency(h.currentValue, h.currency),
            gain: formatCurrency(h.gainLoss, h.currency),
            "gain%": formatPercent(h.gainLossPercent),
          })),
          format,
          [
            { key: "name", label: "Name" },
            { key: "isin", label: "ISIN" },
            { key: "qty", label: "Qty", align: "right" },
            { key: "value", label: "Value", align: "right" },
            { key: "gain", label: "Gain/Loss", align: "right" },
            { key: "gain%", label: "Return", align: "right" },
          ]
        );
      } catch (err) {
        handleError(err);
      }
    });
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
