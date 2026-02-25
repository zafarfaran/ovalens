export const CURRENT_TAX_YEAR = {
  label: "2025/26",
  startDate: "2025-04-06",
  endDate: "2026-04-05",
} as const;

export const PENSION_AA_HISTORY: Record<string, number> = {
  "2025/26": 60_000,
  "2024/25": 60_000,
  "2023/24": 60_000,
  "2022/23": 40_000,
  "2021/22": 40_000,
};
