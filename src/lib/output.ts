import type { OutputFormat } from "./config.ts";
import { NO_COLOR } from "./config.ts";

const c = {
  bold: (s: string) => (NO_COLOR ? s : `\x1b[1m${s}\x1b[0m`),
  dim: (s: string) => (NO_COLOR ? s : `\x1b[2m${s}\x1b[0m`),
  green: (s: string) => (NO_COLOR ? s : `\x1b[32m${s}\x1b[0m`),
  red: (s: string) => (NO_COLOR ? s : `\x1b[31m${s}\x1b[0m`),
  cyan: (s: string) => (NO_COLOR ? s : `\x1b[36m${s}\x1b[0m`),
};

export { c };

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(
  rows: Record<string, unknown>[],
  columns: { key: string; label: string; align?: "left" | "right" }[]
): void {
  if (rows.length === 0) {
    console.log(c.dim("No results."));
    return;
  }

  const widths = columns.map((col) =>
    Math.max(col.label.length, ...rows.map((r) => String(r[col.key] ?? "").length))
  );

  const header = columns
    .map((col, i) => c.bold(col.label.padEnd(widths[i] ?? 0)))
    .join("  ");
  const divider = widths.map((w) => "-".repeat(w)).join("  ");

  console.log(header);
  console.log(c.dim(divider));

  for (const row of rows) {
    const line = columns
      .map((col, i) => {
        const val = String(row[col.key] ?? "");
        return col.align === "right" ? val.padStart(widths[i] ?? 0) : val.padEnd(widths[i] ?? 0);
      })
      .join("  ");
    console.log(line);
  }
}

export function printMarkdown(data: unknown): void {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    const rows = data as Record<string, unknown>[];
    const keys = Object.keys(rows[0] ?? {});
    const header = `| ${keys.join(" | ")} |`;
    const divider = `| ${keys.map(() => "---").join(" | ")} |`;
    const body = rows.map((r) => `| ${keys.map((k) => r[k] ?? "").join(" | ")} |`).join("\n");
    console.log([header, divider, body].join("\n"));
  } else {
    console.log("```json");
    console.log(JSON.stringify(data, null, 2));
    console.log("```");
  }
}

export function print(data: unknown, format: OutputFormat, tableColumns?: { key: string; label: string; align?: "left" | "right" }[]): void {
  if (format === "json") {
    printJson(data);
  } else if (format === "markdown") {
    printMarkdown(data);
  } else if (tableColumns && Array.isArray(data)) {
    printTable(data as Record<string, unknown>[], tableColumns);
  } else {
    printJson(data);
  }
}

export function error(msg: string): void {
  console.error(c.red(`error: ${msg}`));
}

export function info(msg: string): void {
  if (!process.env["PARQET_QUIET"]) console.error(c.dim(msg));
}
