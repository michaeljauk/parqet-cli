import { describe, it, expect } from "bun:test";
import { pct, fmt } from "./format.ts";

describe("pct()", () => {
  it("formats negative percent points", () => {
    expect(pct(-0.9569)).toBe("-0.96%");
  });

  it("formats positive percent points with + prefix", () => {
    expect(pct(12.5)).toBe("+12.50%");
  });

  it("formats zero", () => {
    expect(pct(0)).toBe("+0.00%");
  });

  it("formats small negative (< -1)", () => {
    expect(pct(-15.3)).toBe("-15.30%");
  });

  it("does not multiply by 100", () => {
    // API returns -0.9569 meaning -0.96%, NOT -96%
    expect(pct(-0.9569)).not.toBe("-95.69%");
  });
});

describe("fmt()", () => {
  it("formats EUR currency", () => {
    expect(fmt(11961.76, "EUR")).toContain("11");
    expect(fmt(11961.76, "EUR")).toContain("961");
  });

  it("formats negative values", () => {
    expect(fmt(-116.55, "EUR")).toContain("116");
  });

  it("formats zero", () => {
    expect(fmt(0, "EUR")).toContain("0");
  });
});
