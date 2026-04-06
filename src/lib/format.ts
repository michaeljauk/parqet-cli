// API returns percent points directly (e.g. -0.9569 = -0.96%)
export function pct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function fmt(value: number, currency: string): string {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(value);
}
