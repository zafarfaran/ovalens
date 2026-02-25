export function formatGBP(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
