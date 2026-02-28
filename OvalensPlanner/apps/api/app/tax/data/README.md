# Tax year data (single source of truth)

One YAML file per tax year. To add a new year (e.g. 2026/27):

1. Copy `2025_26.yaml` to `2026_27.yaml`.
2. Update all values from HMRC/Budget sources.
3. Run tests; fix any schema/validation issues.

See **docs/TAX_YEAR_UPDATE_PROCESS.md** for the full runbook.
