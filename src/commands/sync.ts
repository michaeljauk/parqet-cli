import { Command } from "commander";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { api, AuthError, ApiError, type Timeframe } from "../lib/api.ts";
import { c, error, info } from "../lib/output.ts";

const DEFAULT_OUTPUT_DIR = join(homedir(), "brain", "projects", "parqet", "snapshots");

export function registerSyncCommand(program: Command): void {
  program
    .command("sync")
    .description("Fetch portfolio snapshot and write Markdown to brain repo")
    .option("--portfolio <id>", "Portfolio ID (uses first portfolio if omitted)")
    .option("--timeframe <tf>", "Timeframe: 1d,1w,mtd,1m,3m,6m,1y,ytd,3y,5y,10y,max", "ytd")
    .option("--out <dir>", "Output directory", DEFAULT_OUTPUT_DIR)
    .option("--dry-run", "Print output without writing to disk")
    .action(async (opts: { portfolio?: string; timeframe?: string; out?: string; dryRun?: boolean }) => {
      try {
        const portfolios = await api.portfolios();
        if (portfolios.length === 0) { error("No portfolios found."); process.exit(1); }

        const portfolio = opts.portfolio
          ? portfolios.find((p) => p.id === opts.portfolio) ?? (() => { throw new Error(`Portfolio not found: ${opts.portfolio}`); })()
          : portfolios[0]!;

        info(`Fetching performance for "${portfolio.name}"...`);
        const timeframe = (opts.timeframe ?? "ytd") as Timeframe;
        const { performance, holdings } = await api.performance([portfolio.id], timeframe);

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 5);

        const md = buildMarkdown({ portfolio, performance, holdings, dateStr, timeStr, timeframe });

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

type SyncArgs = {
  portfolio: { id: string; name: string; currency: string };
  performance: import("../lib/api.ts").PerformanceSummary;
  holdings: import("../lib/api.ts").Holding[];
  dateStr: string;
  timeStr: string;
  timeframe: string;
};

function buildMarkdown({ portfolio, performance, holdings, dateStr, timeStr, timeframe }: SyncArgs): string {
  const fmt = (v: number) =>
    new Intl.NumberFormat("de-AT", { style: "currency", currency: portfolio.currency }).format(v);
  const pct = (v: number) => {
    const m = v > 1 ? v : v * 100;
    return `${m >= 0 ? "+" : ""}${m.toFixed(2)}%`;
  };

  const ug = performance.unrealizedGains.inInterval;

  const holdingRows = holdings
    .filter((h) => !h.position.isSold)
    .sort((a, b) => b.position.currentValue - a.position.currentValue)
    .map((h) => {
      const name = h.asset?.name ?? h.nickname ?? h.id;
      const isin = h.asset?.isin ?? "-";
      return `| ${name} | ${isin} | ${fmt(h.position.currentValue)} | ${pct(h.performance.unrealizedGains.inInterval.returnGross)} |`;
    })
    .join("\n");

  const twr = performance.kpis?.inInterval?.ttwror != null
    ? `\n| TWR | ${pct(performance.kpis.inInterval.ttwror)} |`
    : "";

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
| Portfolio Value | ${fmt(performance.valuation.atIntervalEnd)} |
| Start Value | ${fmt(performance.valuation.atIntervalStart)} |
| Unrealized Gain (gross) | ${fmt(ug.gainGross)} |
| Return (gross) | ${pct(ug.returnGross)} |
| Return (net) | ${pct(ug.returnNet)} |${twr}

## Holdings

| Name | ISIN | Value | Return |
| --- | --- | --- | --- |
${holdingRows}
`;
}
