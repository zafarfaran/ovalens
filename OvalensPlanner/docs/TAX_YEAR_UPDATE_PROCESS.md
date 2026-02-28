# Tax Year Update Process — Scalable and Easily Modifiable

UK tax rates, thresholds, and allowances change each year (often at Budget or from HMRC announcements). This doc describes how to keep updates **seamless**, **scalable**, and **easy to modify** without touching calculator logic.

---

## 1) Principles

- **Single source of truth:** One place per tax year holds all numbers (API data files). Frontend/shared constants are derived or documented to stay in sync.
- **Data, not code:** Rates and thresholds live in **data files** (e.g. YAML per tax year), not hardcoded in Python. Adding a new year = add one file (and run tests).
- **Schema validation:** The shape of a “tax year” is defined and validated (e.g. Pydantic) so mistakes are caught on load and new years are consistent.
- **Explicit default:** The “current” tax year is configurable or derived from date so the app and tools default correctly.
- **Testable:** Tax engine tests are year-agnostic or parameterised by year; golden outputs can be updated in one place when a new year is added.

---

## 2) Recommended Structure

### 2.1 API (authoritative source)

```
apps/api/app/tax/
  data/
    2025_26.yaml    # All constants for 2025/26
    2026_27.yaml    # Add when 2026/27 is announced
  schema.py         # Pydantic (or TypedDict) for one tax year
  loader.py         # Load YAML files, validate, expose get_tax_year_constants()
  constants.py      # Re-exports + backward-compat (or thin wrapper)
```

- **One file per tax year** (`YYYY_YY.yaml`). Copy the previous year’s file, update the values, and fix any new/removed keys. No Python logic changes.
- **Loader** discovers all `*.yaml` in `data/` (or a registry list), validates each against the schema, and builds the in-memory map. `get_tax_year_constants(tax_year)` returns the dict for that year (e.g. `"2025/26"` → key `2025_26`).
- **Schema** documents and enforces structure: income_tax, pa_taper, ni, dividends, savings, hicbc, pension, allowances, cgt, iht. New bands or sections require a schema change once; then all years benefit.

### 2.2 Default tax year (implemented)

- **Config:** Optional `DEFAULT_TAX_YEAR` (e.g. `"2025/26"`) in API settings (`app.config`); see `apps/api/.env.example`.
- **Fallback:** If unset, `app.utils.tax_year.get_default_tax_year()` uses `get_current_tax_year()` (date-based: before 6 April → previous year label).
- **Usage:** Call `get_tax_year_constants()` with no argument to use the default, or pass `tax_year` explicitly. Use `get_default_tax_year()` when you need the default year label only.

### 2.3 Frontend / shared package

- **Option A (recommended):** **Generate** TypeScript constants from the API YAML (or from an API endpoint that exposes the active year’s constants). Single source of truth; no manual sync.
- **Option B:** Keep shared as manual copy; document it in the runbook and add a “Tax constants” checklist to the annual update so both API and shared are updated together.

---

## 3) Schema (What One Tax Year Contains)

A single tax year’s data should include at least (aligned with current `constants.py`):

| Section        | Purpose |
|----------------|--------|
| `income_tax`   | Personal allowance, band widths/ceilings, rates (rUK + Scottish) |
| `pa_taper`     | Threshold and taper rate |
| `ni`           | Class 1, 2, 4 thresholds and rates |
| `dividends`    | Allowance and rates |
| `savings`      | PSA, starting rate band |
| `hicbc`        | Child benefit thresholds and weekly amounts |
| `pension`      | Annual allowance, taper, lump sums, `aa_history` for carry forward |
| `allowances`   | ISA, LISA, marriage allowance, trading/property, etc. |
| `cgt`          | AEA, rates, BADR, investors’ relief |
| `iht`          | Nil-rate bands, rate |

Schema validation (e.g. Pydantic) should run when loading each YAML file so that typos, missing keys, or wrong types are caught at startup (or in a small CLI that validates all files).

---

## 4) Annual Update Runbook

Use this when a new tax year (e.g. 2026/27) is announced and you want to add it without breaking existing behaviour.

1. **Create the new data file**
   - Copy `data/2025_26.yaml` to `data/2026_27.yaml`.
   - Replace all values with the new year’s figures (HMRC/Budget sources). Leave structure identical unless the schema was extended.

2. **Validate**
   - Run the loader (or app startup) and fix any schema/validation errors.
   - Run the tax engine test suite; update any golden outputs or parameterised expectations for the new year if needed.

3. **Default tax year**
   - If you want 2026/27 to be the default as of a certain date, ensure `get_default_tax_year()` uses your config or date logic so new sessions default to 2026/27 when appropriate.

4. **Shared / frontend**
   - If using codegen: run the script that generates TS from YAML (or from API) and commit.
   - If manual: update `packages/shared` constants and `CURRENT_TAX_YEAR` to match the new year, then run frontend tests.

5. **Docs and release**
   - Note “2026/27 supported” in changelog/release notes.
   - Optionally add a short “Tax year support” section in user-facing docs listing supported years and how the default is chosen.

---

## 5) Making It Easily Modifiable

- **Clear file names:** `2025_26.yaml`, `2026_27.yaml` — no magic; anyone can add a file.
- **Comments in YAML:** Use comments to note source (e.g. “Budget 2025”) or “frozen until 2028” so future updates are obvious.
- **Single place for each number:** No duplication of the same threshold in multiple files; refer to the one data file per year.
- **Tests by year:** Where possible, parameterise tests by `tax_year` and keep expected values in a small table or file so updating a year is a single edit.
- **Changelog for tax data:** Optional: a `data/CHANGELOG.md` or inline comments recording “2026/27: PA unchanged, basic rate ceiling increased to …” for auditability.

---

## 6) Optional: Codegen for Shared (TypeScript)

To keep the web app in sync with the API without manual copy-paste:

- **Script (e.g. `scripts/generate_tax_constants_ts.py`):** Reads `app/tax/data/*.yaml`, picks the “current” year (or a flag), and writes `packages/shared/src/constants/generated/tax-rates.ts` (and optionally thresholds, allowances, ni, etc.) with the correct TypeScript types and values.
- **CI:** Add a step that runs the script and fails if generated files differ from committed files (so any YAML change forces an explicit commit of updated TS).
- **Single source:** API YAML remains the only place to edit numbers; shared stays generated and consistent.

---

## 7) Summary

| Goal                | Approach |
|---------------------|----------|
| **Scalable**        | One data file per tax year; loader builds map; add a file to add a year. |
| **Easily modifiable** | Edit YAML only; schema validates; no business logic changes. |
| **Seamless process** | Runbook: copy previous YAML → update values → validate → tests → default year → shared/codegen → release. |
| **Single source**   | API data files are authoritative; shared TS generated or updated via checklist. |
| **Safe**            | Schema + tests catch errors; default tax year is explicit and configurable. |

Implementing the data directory, schema, and loader in the API gives you a scalable, easily modifiable base; the runbook and optional codegen complete the annual update process.

---

## 8) What’s in the repo (implementation summary)

- **`apps/api/app/tax/data/`** — One YAML file per tax year (e.g. `2025_26.yaml`). Add `2026_27.yaml` when figures are announced.
- **`apps/api/app/tax/loader.py`** — Loads all `data/*.yaml`, exposes `get_tax_year_constants(tax_year)`, `list_supported_tax_years()`, `get_all_tax_years()`.
- **`apps/api/app/tax/constants.py`** — Uses the loader; re-exports `get_tax_year_constants(tax_year=None)` (default = config or current date) and backward-compat module-level constants from the default year.
- **`apps/api/app/utils/tax_year.py`** — `get_current_tax_year()` (date-based), `get_default_tax_year()` (config or current date).
- **Config** — Optional `DEFAULT_TAX_YEAR` in API settings and `.env.example`.
- **Dependency** — `pyyaml` in `requirements.txt` and `pyproject.toml`.

Adding a new tax year: copy `data/2025_26.yaml` to `data/2026_27.yaml`, update values, run tests.
