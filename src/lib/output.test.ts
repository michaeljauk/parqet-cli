import { describe, it, expect } from "bun:test";
import { printTable, printJson, printMarkdown } from "./output.ts";

describe("printJson()", () => {
  it("outputs valid JSON", () => {
    const output: string[] = [];
    const origLog = console.log;
    console.log = (s: string) => output.push(s);
    printJson({ key: "value" });
    console.log = origLog;
    const joined = output.join("\n");
    expect(joined).toContain('"key"');
    expect(joined).toContain('"value"');
  });
});

describe("printTable()", () => {
  it("renders header and rows", () => {
    const output: string[] = [];
    const origLog = console.log;
    console.log = (s: string) => output.push(s);

    printTable(
      [{ name: "SPDR MSCI World", value: "€ 3.964,08" }],
      [{ key: "name", label: "Name" }, { key: "value", label: "Value", align: "right" }]
    );

    console.log = origLog;
    expect(output.some((l) => l.includes("Name"))).toBe(true);
    expect(output.some((l) => l.includes("SPDR MSCI World"))).toBe(true);
  });

  it("shows 'No results.' for empty array", () => {
    const output: string[] = [];
    const origLog = console.log;
    console.log = (s: string) => output.push(s);

    printTable([], [{ key: "name", label: "Name" }]);

    console.log = origLog;
    expect(output.some((l) => l.includes("No results."))).toBe(true);
  });
});

describe("printMarkdown()", () => {
  it("renders a markdown table for array input", () => {
    const output: string[] = [];
    const origLog = console.log;
    console.log = (s: string) => output.push(s);

    printMarkdown([{ name: "Apple", isin: "US0378331005" }]);

    console.log = origLog;
    const joined = output.join("\n");
    expect(joined).toContain("| name | isin |");
    expect(joined).toContain("| Apple | US0378331005 |");
  });
});
