import { Command } from "commander";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { api, AuthError, ApiError } from "../lib/api.ts";
import { c, error, info } from "../lib/output.ts";

const DEFAULT_OUTPUT_DIR = join(homedir(), "brain", "projects", "parqet", "snapshots");

export function registerSyncCommand(program: Command): void {
  program
    .command("sync")
    .description("Fetch portfolio snapshot and write Markdown to brain repo")
    .option("--portfolio <id>", "Portfolio ID (uses first portfolio if omitted)")
    .option("--timeframe <tf>", "Timeframe: today, 7d, mtd, ytd, 1y, 3y, 5y, max", "ytd")
    .option("--out <dir>", "Output directory", DEFAULT_OUTPUT_DIR)
    .option("--dry-run", "Print output without writing to disk")
    .action(async (opts: { portfolio?: string; timeframe?: string; out?: string; dryRun?: boolean }) => {
      try {
        // Resolve portfolio ID
        let portfolioId = opts.portfolio;
        if (!portfolioId) {
          info("No --portfolio specified, fetching first portfolio...");
          const portfolios = await api.portfolios();
          if (portfolios.length === 0) {
            error("No portfolios found.");
            process.exit(1);
          }
          portfolioId = portfolios[0]!.id;
        }

        const { portfolio, performance } = await api.portfolio(portfolioId, opts.timeframe ?? "ytd");
        const holdings = await api.holdings(portfolioId);

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 5);

        const md = buildMarkdown({ portfolio, performance, holdings, dateStr, timeStr, timeframe: opts.timeframe ?? "ytd" });

        if (opts.dryRun) {
          console.log(md);
          return;
        }

        const outDir = opts.out ?? DEFAULT_OUTPUT_DIR;
        await mkdir(outDir, { recursive: true });
        const filename = join(outDir, `${dateStr}.md`);
        await writeFile(filename, md, "utf8");

        console.log(c.green(`Snapshot saved: ${filename}`));
      } catch (err) {
        if (err instanceof AuthError) { error(err.message); process.exit(2); }
        if (err instanceof ApiError) { error(err.message); process.exit(1); }
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

interface SnapshotArgs {
  portfolio: { id: string; name: string; currency: string };
  performance: { portfolioValue: number; unrealized: { gainGross: number; returnGross: number }; dividends?: { gainNet: number } };
  holdings: Array<{ name: string; isin?: string; currentValue: number; gainLoss: number; gainLossPercent: number; currency: string }>;
  dateStr: string;
  timeStr: string;
  timeframe: string;
}

function buildMarkdown({ portfolio, performance, holdings, dateStr, timeStr, timeframe }: SnapshotArgs): string {
  const fmt = (v: number) => new Intl.NumberFormat("de-AT", { style: "currency", currency: portfolio.currency }).format(v);
  const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

  const holdingRows = holdings
    .sort((a, b) => b.currentValue - a.currentValue)
    .map((h) => `| ${h.name} | ${h.isin ?? "-"} | ${fmt(h.currentValue)} | ${pct(h.gainLossPercent)} |`)
    .join("\n");

  return `---
title: Parqet Snapshot ${dateStr}
date: ${dateStr}
timeframe: ${timeframe}
portfolio: ${portfolio.name}
tags: [wealth, parqet, portfolio]
---

# Portfolio Snapshot — ${dateStr} ${timeStr}

**Portfolio:** ${portfolio.name}
**Timeframe:** ${timeframe}

| Metric | Value |
| --- | --- |
| Portfolio Value | ${fmt(performance.portfolioValue)} |
| Unrealized Gain | ${fmt(performance.unrealized.gainGross)} |
| Return (gross) | ${pct(performance.unrealized.returnGross)} |${performance.dividends ? `\n| Dividends (net) | ${fmt(performance.dividends.gainNet)} |` : ""}

## Holdings

| Name | ISIN | Value | Return |
| --- | --- | --- | --- |
${holdingRows}
`;
}
