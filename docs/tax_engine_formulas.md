# Helio Tax Engine — Formulas & Methodology

**Tax Year**: 2025/26 (6 April 2025 – 5 April 2026)
**Purpose**: This document describes every calculation the Helio tax engine performs, in the order it performs them. It is written for a financial adviser to verify correctness.

---

## Contents

1. [Calculation Order](#1-calculation-order)
2. [Rounding Rules](#2-rounding-rules)
3. [Adjusted Net Income & Personal Allowance](#3-adjusted-net-income--personal-allowance)
4. [Income Tax (England/Wales/NI)](#4-income-tax-englandwalesni)
5. [Income Tax (Scotland)](#5-income-tax-scotland)
6. [Income Ordering & Band Stacking](#6-income-ordering--band-stacking)
7. [Savings Income & Personal Savings Allowance](#7-savings-income--personal-savings-allowance)
8. [Dividend Income & Dividend Allowance](#8-dividend-income--dividend-allowance)
9. [Basic Rate Band Extension (Gift Aid & Pension)](#9-basic-rate-band-extension-gift-aid--pension)
10. [National Insurance — Class 1 (Employees)](#10-national-insurance--class-1-employees)
11. [National Insurance — Class 2 (Self-Employed)](#11-national-insurance--class-2-self-employed)
12. [National Insurance — Class 4 (Self-Employed)](#12-national-insurance--class-4-self-employed)
13. [High Income Child Benefit Charge (HICBC)](#13-high-income-child-benefit-charge-hicbc)
14. [Pension Annual Allowance](#14-pension-annual-allowance)
15. [Pension AA Taper](#15-pension-aa-taper)
16. [Pension Carry Forward](#16-pension-carry-forward)
17. [Marginal Rate & the 60% Trap](#17-marginal-rate--the-60-trap)
18. [Salary Sacrifice Modelling](#18-salary-sacrifice-modelling)
19. [Summary Totals](#19-summary-totals)
20. [Worked Example — Full Computation](#20-worked-example--full-computation)
21. [Constants Reference](#21-constants-reference)

---

## 1. Calculation Order

The engine computes in this exact sequence. Each step depends on the ones before it.

```
1. Categorise income → non-savings, savings, dividends
2. Calculate Adjusted Net Income (ANI) → determines PA
3. Derive Personal Allowance (using PA taper if ANI > £100k)
4. Calculate Income Tax (allocate PA, stack income through bands)
5. Calculate National Insurance (Class 1 or Class 2 + Class 4)
6. Calculate HICBC (if applicable)
7. Calculate Pension Annual Allowance (taper + carry forward)
8. Compute marginal rate
9. Sum: Total Tax = Income Tax + NI + HICBC
10. Effective rate = Total Tax / Total Income × 100
```

---

## 2. Rounding Rules

We follow HMRC's approach:

- **Income tax per band**: Truncated to whole pounds (rounded DOWN). This is how HMRC's SA calculation works — each band's tax is floored before summing.
- **National Insurance**: Standard rounding to 2 decimal places.
- **All other amounts**: Standard rounding to 2 decimal places.

Example: if a band produces tax of £7,539.80, we record £7,539 (not £7,540).

---

## 3. Adjusted Net Income & Personal Allowance

### ANI Formula

```
ANI = Total Income − Gross Pension Contributions − Grossed-Up Gift Aid
```

Where:
- **Total Income** = sum of all income sources (employment, self-employment, rental, savings, dividends, pension income, other) net of allowable expenses
- **Gross Pension Contributions** = personal contributions to relief-at-source pensions (SIPP, workplace personal pension). NOT employer contributions or salary sacrifice.
- **Grossed-Up Gift Aid** = Net Gift Aid donation ÷ 0.8

Example:
- Total income = £130,000
- Personal pension contribution = £10,000
- Gift Aid donation (net) = £4,000 → grossed up = £4,000 ÷ 0.8 = £5,000
- **ANI = £130,000 − £10,000 − £5,000 = £115,000**

### Personal Allowance Taper

| ANI | Personal Allowance |
|-----|-------------------|
| ≤ £100,000 | £12,570 (full) |
| £100,001 – £125,140 | Tapered (see formula below) |
| ≥ £125,140 | £0 (fully lost) |

**Taper formula** (when ANI is between £100,000 and £125,140):

```
Excess = ANI − £100,000
Reduction = floor(Excess / 2)       ← HMRC uses floor division
PA = max(0, £12,570 − Reduction)
```

HMRC rounds the reduction down — incomplete £2 increments don't count.

**Worked example** (ANI = £115,000):

```
Excess = £115,000 − £100,000 = £15,000
Reduction = floor(£15,000 / 2) = £7,500
PA = £12,570 − £7,500 = £5,070
```

**Boundary check**: The PA is fully eliminated at ANI = £100,000 + (£12,570 × 2) = **£125,140**.

---

## 4. Income Tax (England/Wales/NI)

Non-savings, non-dividend income is taxed through these bands:

| Band | Band Width | Cumulative Ceiling | Rate |
|------|----------:|-------------------:|-----:|
| Basic Rate | £37,700 | £37,700 | 20% |
| Higher Rate | £74,870 | £112,570 | 40% |
| Additional Rate | Unlimited | — | 45% |

**Important**: These are band widths ABOVE the Personal Allowance. The PA is deducted from income before applying bands.

**Formula**:

```
Taxable Non-Savings Income = Non-Savings Income − Personal Allowance

Tax per band = floor(Income in Band × Rate)     ← truncated to whole £
Total Income Tax = sum of all band taxes
```

**Worked example** (non-savings income = £80,000, PA = £12,570):

```
Taxable = £80,000 − £12,570 = £67,430

Basic Rate:    min(£67,430, £37,700) = £37,700 × 20% = £7,540
Higher Rate:   £67,430 − £37,700 = £29,730 × 40% = £11,892
Additional:    £0

Total Income Tax = £7,540 + £11,892 = £19,432
```

---

## 5. Income Tax (Scotland)

Scottish taxpayers pay different rates on non-savings, non-dividend income only. Savings and dividends still use UK rates.

| Band | Band Width | Cumulative Ceiling | Rate |
|------|----------:|-------------------:|-----:|
| Starter Rate | £2,306 | £2,306 | 19% |
| Basic Rate | £11,685 | £13,991 | 20% |
| Intermediate Rate | £17,101 | £31,092 | 21% |
| Higher Rate | £31,338 | £62,430 | 42% |
| Advanced Rate | £50,140 | £112,570 | 45% |
| Top Rate | Unlimited | — | 48% |

Same rules apply: PA deducted first, tax per band truncated to whole pounds.

---

## 6. Income Ordering & Band Stacking

HMRC taxes income in a strict order. Each type of income fills up the bands in sequence, and the next type starts where the previous one left off.

```
Order:
1. Non-savings income (employment, self-employment, rental, pension income)
2. Savings income (bank interest)
3. Dividend income

The PA is allocated in the same order:
  − PA first absorbs non-savings income
  − Any remaining PA absorbs savings income
  − Any remaining PA absorbs dividend income
```

**Band stacking** means savings income starts at whichever band position the non-savings income reached, and dividends start where savings income ended. They share the same band space.

**Example** (non-savings £45,000 + dividends £20,000, PA = £12,570):

```
Non-savings taxable = £45,000 − £12,570 = £32,430
  → fills Basic Rate band: £32,430 (leaves £5,270 of basic band)

Dividends = £20,000 (no PA left to absorb)
  → fills remaining Basic Rate: £5,270 at basic dividend rate (8.75%)
  → overflows into Higher Rate: £14,730 at higher dividend rate (33.75%)
```

**Key for Scottish taxpayers**: Scottish bands apply to non-savings income only. Savings and dividends always use UK bands — but the cursor position (how much band space has been used) is still set by how much non-savings income there was.

---

## 7. Savings Income & Personal Savings Allowance

Savings income (bank interest) is taxed at income tax rates, but with the **Personal Savings Allowance (PSA)** applied first:

| Taxpayer Status | PSA |
|----------------|----:|
| Basic rate taxpayer | £1,000 |
| Higher rate taxpayer | £500 |
| Additional rate taxpayer | £0 |

The taxpayer's status is determined by where their non-savings income sits in the bands (before savings income is added).

**Formula**:

```
1. Determine PSA from non-savings taxable income:
     If non-savings taxable ≤ £37,700       → PSA = £1,000
     If £37,700 < non-savings ≤ £112,570    → PSA = £500
     If non-savings > £112,570              → PSA = £0

2. Savings income enters the band stack where non-savings left off.

3. Within each band, PSA is applied first (zero-rated), then the remainder
   is taxed at the band's income tax rate (20%/40%/45%).
```

---

## 8. Dividend Income & Dividend Allowance

Dividends use their own rates, but share band space with other income:

| Band Position | Dividend Rate |
|--------------|-------------:|
| Within Basic Rate band | 8.75% |
| Within Higher Rate band | 33.75% |
| Within Additional Rate band | 39.35% |

The **Dividend Allowance** is **£500** (2025/26). The first £500 of dividends within any band is taxed at 0%.

**Formula**:

```
1. Dividends enter the band stack where savings income left off.
2. Within each band, the Dividend Allowance is applied first (0% rate).
3. Remaining dividends are taxed at the dividend rate for that band.
```

**Worked example** (dividends of £32,500, entering at the Additional Rate band position):

```
Dividend Allowance: first £500 at 0% = £0
Remaining: £32,000 at 39.35% = £12,592

Total Dividend Tax = £12,592
```

**Scottish taxpayers**: Dividends always use UK dividend rates, not Scottish rates. The Scottish bands map to UK dividend rates as follows:
- Starter Rate, Basic Rate, Intermediate Rate → 8.75% (basic dividend rate)
- Higher Rate, Advanced Rate → 33.75% (higher dividend rate)
- Top Rate → 39.35% (additional dividend rate)

---

## 9. Basic Rate Band Extension (Gift Aid & Pension)

Both grossed-up Gift Aid donations and gross personal pension contributions **extend the Basic Rate Band**. This gives higher/additional rate taxpayers extra relief.

```
Extended BRB width = £37,700 + Grossed-Up Gift Aid + Gross Pension Contributions
```

**Example**: Personal pension contribution of £10,000, Gift Aid of £4,000 (net):

```
Gift Aid gross = £4,000 / 0.8 = £5,000
Extension = £10,000 + £5,000 = £15,000
Extended BRB = £37,700 + £15,000 = £52,700
```

This means more income is taxed at 20% rather than 40%, which IS the higher/additional rate relief mechanism for relief-at-source pensions.

**Note**: This extension applies to the bands used for ALL income types (non-savings, savings, dividends). For Scottish taxpayers, it extends the Basic Rate band within the Scottish schedule AND within the UK schedule (used for savings/dividends).

---

## 10. National Insurance — Class 1 (Employees)

Class 1 NICs are calculated on **gross employment earnings** (before any income tax deductions, but after salary sacrifice).

### Employee NICs

| Earnings Band | Rate |
|--------------|-----:|
| Up to £12,570 (Primary Threshold) | 0% |
| £12,570 – £50,270 (Upper Earnings Limit) | 8% |
| Above £50,270 | 2% |

**Formula**:

```
If earnings ≤ £12,570:
    Employee NI = £0

If £12,570 < earnings ≤ £50,270:
    Employee NI = (earnings − £12,570) × 8%

If earnings > £50,270:
    Main NI = (£50,270 − £12,570) × 8% = £3,016.00
    Upper NI = (earnings − £50,270) × 2%
    Employee NI = Main NI + Upper NI
```

### Employer NICs

| Earnings Band | Rate |
|--------------|-----:|
| Up to £5,000 (Secondary Threshold) | 0% |
| Above £5,000 | 15% |

```
Employer NI = max(0, earnings − £5,000) × 15%
```

**Worked example** (earnings = £145,000):

```
Employee:
  Main NI = (£50,270 − £12,570) × 8% = £37,700 × 0.08 = £3,016.00
  Upper NI = (£145,000 − £50,270) × 2% = £94,730 × 0.02 = £1,894.60
  Total Employee NI = £4,910.60

Employer:
  Employer NI = (£145,000 − £5,000) × 15% = £140,000 × 0.15 = £21,000.00
```

---

## 11. National Insurance — Class 2 (Self-Employed)

A flat weekly rate, payable if profits are at or above the threshold.

| Threshold | Weekly Rate | Annual |
|-----------|----------:|-------:|
| Profits ≥ £12,570 | £3.45 | £179.40 |
| Profits < £12,570 | — | £0 |

```
If profits ≥ £12,570:
    Class 2 NI = 52 weeks × £3.45 = £179.40
Else:
    Class 2 NI = £0
```

---

## 12. National Insurance — Class 4 (Self-Employed)

Profits-based contributions, structured similarly to Class 1 but at different rates.

| Profits Band | Rate |
|-------------|-----:|
| Up to £12,570 (Lower Profits Limit) | 0% |
| £12,570 – £50,270 (Upper Profits Limit) | 6% |
| Above £50,270 | 2% |

**Formula**:

```
If profits ≤ £12,570:
    Class 4 NI = £0

If £12,570 < profits ≤ £50,270:
    Class 4 NI = (profits − £12,570) × 6%

If profits > £50,270:
    Main NI = (£50,270 − £12,570) × 6% = £37,700 × 0.06 = £2,262.00
    Upper NI = (profits − £50,270) × 2%
    Class 4 NI = Main NI + Upper NI
```

**Self-employed total NI** = Class 2 + Class 4.

---

## 13. High Income Child Benefit Charge (HICBC)

HICBC is a tax charge that claws back Child Benefit when the higher earner's ANI exceeds £60,000.

### Child Benefit Rates (2025/26)

| | Weekly | Annual (×52) |
|-|-------:|-------------:|
| First child | £26.05 | £1,354.60 |
| Each additional child | £17.25 | £897.00 |

**Two children**: £26.05 + £17.25 = £43.30/week = **£2,251.60/year**

### HICBC Clawback Formula

```
If ANI ≤ £60,000:
    Clawback = 0%

If £60,000 < ANI < £80,000:
    Clawback % = floor((ANI − £60,000) / £200)
    (i.e., 1% for every complete £200 over £60,000)

If ANI ≥ £80,000:
    Clawback = 100%

HICBC Charge = Annual Child Benefit × Clawback % / 100
Net Benefit = Annual Child Benefit − HICBC Charge
```

HMRC uses **floor** — only complete £200 increments count.

**Worked example** (ANI = £70,000, 2 children):

```
Annual Benefit = £2,251.60
Clawback % = floor((£70,000 − £60,000) / £200) = floor(50) = 50%
HICBC Charge = £2,251.60 × 50% = £1,125.80
Net Benefit = £2,251.60 − £1,125.80 = £1,125.80
```

---

## 14. Pension Annual Allowance

The standard Annual Allowance for 2025/26 is **£60,000**. Both personal AND employer contributions (including salary sacrifice) count toward this limit.

```
Total Pension Input = Personal Contributions + Employer Contributions

If Total Pension Input > Annual Allowance:
    Annual Allowance Charge applies (taxed as income at marginal rate)
```

If the **Money Purchase Annual Allowance (MPAA)** has been triggered (by flexibly accessing a defined contribution pension), the allowance drops to **£10,000** and carry forward is NOT available.

---

## 15. Pension AA Taper

High earners may have their Annual Allowance reduced.

**Two conditions must BOTH be met for the taper to apply:**

```
1. Threshold Income > £200,000
2. Adjusted Income > £260,000
```

Where:
- **Threshold Income** = Total Income − Personal Pension Contributions
- **Adjusted Income** = Threshold Income + Personal Contributions + Employer Contributions = Total Income + Employer Contributions

**Taper formula (when both conditions are met)**:

```
Excess = Adjusted Income − £260,000
Reduction = Excess / 2
Tapered AA = max(£10,000, £60,000 − Reduction)
```

The minimum tapered AA is **£10,000**.

**Worked example** (total income = £280,000, personal contributions = £20,000, employer = £10,000):

```
Threshold Income = £280,000 − £20,000 = £260,000 → exceeds £200,000 ✓
Adjusted Income = £280,000 + £10,000 = £290,000 → exceeds £260,000 ✓

Excess = £290,000 − £260,000 = £30,000
Reduction = £30,000 / 2 = £15,000
Tapered AA = £60,000 − £15,000 = £45,000
```

---

## 16. Pension Carry Forward

Unused Annual Allowance from the **3 previous tax years** can be carried forward and used in the current year. You must use the current year's allowance first, then carry forward from the earliest year.

**AA History:**

| Tax Year | Standard AA |
|----------|----------:|
| 2024/25 | £60,000 |
| 2023/24 | £60,000 |
| 2022/23 | £40,000 |

```
For each prior year:
    Unused = Annual Allowance for that year − Contributions made in that year

Total Carry Forward = sum of Unused across all 3 years
Total Available = Current Year AA + Total Carry Forward
Remaining = Total Available − Current Year Contributions
```

**Worked example** (current year contributions = £80,000):

```
2024/25: AA £60,000, contributed £20,000 → unused £40,000
2023/24: AA £60,000, contributed £15,000 → unused £45,000
2022/23: AA £40,000, contributed £40,000 → unused £0

Total Carry Forward = £40,000 + £45,000 + £0 = £85,000
Total Available = £60,000 (current AA) + £85,000 = £145,000
Remaining = £145,000 − £80,000 = £65,000 ← no AA charge
```

Carry forward is NOT available if the MPAA has been triggered.

---

## 17. Marginal Rate & the 60% Trap

The marginal rate is the tax rate on the next £1 of income. It's not always the headline band rate because of interactions.

### Standard Marginal Rates

| Income Region | Marginal Rate |
|--------------|-------------:|
| Basic Rate band + employee NI above UEL | 20% + 2% = **22%** |
| Basic Rate band + employee NI main rate | 20% + 8% = **28%** |
| Higher Rate band + employee NI above UEL | 40% + 2% = **42%** |
| Additional Rate band + employee NI above UEL | 45% + 2% = **47%** |

### The 60% Trap (£100,000 – £125,140)

When ANI is between £100,000 and £125,140, the PA taper creates an effective 60% income tax rate:

```
For every £2 of income over £100,000:
    £1 of PA is lost → that £1 is now taxed at 40% = 20p effective rate
    The £2 itself is taxed at 40% = 80p

Total tax on £2 = 80p (direct) + 20p (PA loss) = £1.00
Effective rate = £1.00 / £2.00 = 50%... wait.
```

More precisely:

```
On each additional £1 of income in the taper zone:
    Direct tax: £1 × 40% = 40p
    PA loss: £0.50 of PA lost × 40% = 20p
    Total: 60p per £1 = 60%

Add NI (2% above UEL for employees):
    60% + 2% = 62% marginal rate
```

**Our engine computes**:

```
If ANI is between £100,000 and £125,140:
    Marginal Rate = 60% + NI marginal rate

Otherwise:
    Marginal Rate = Highest income tax band rate + NI marginal rate
```

---

## 18. Salary Sacrifice Modelling

Salary sacrifice redirects gross salary into employer pension contributions. The key tax distinction:

| | Personal Pension Contribution | Salary Sacrifice |
|---|---|---|
| Reduces gross pay? | No | Yes |
| Reduces ANI? | Yes (directly) | Yes (via lower income) |
| Extends BRB? | Yes | No (not a personal contribution) |
| Saves employee NI? | No | **Yes** |
| Saves employer NI? | No | **Yes** |
| Counts toward Pension AA? | Yes | Yes (as employer contribution) |

**How we model it**:

```
1. Compute current position:
     Employment income = Gross Salary − Current Sacrifice
     Pass Current Sacrifice as employer_contributions (not pension_contributions)

2. Compute proposed position:
     Employment income = Gross Salary − Proposed Sacrifice
     Pass Proposed Sacrifice as employer_contributions

3. Diff:
     IT Saving = Current IT − Proposed IT
     NI Saving = Current NI − Proposed NI
     HICBC Saving = Current HICBC − Proposed HICBC
     Total Saving = IT + NI + HICBC

4. Context:
     Extra into Pension = Proposed Sacrifice − Current Sacrifice
     Take-home Reduction = Extra into Pension − Total Saving
```

**Why employer_contributions and not pension_contributions?**

Salary sacrifice is legally an employer contribution. The salary has already been reduced before it reaches the employee. So:
- It does NOT reduce ANI again (the lower salary already achieves that)
- It does NOT extend the BRB (only personal contributions do)
- It DOES save NI (both employee and employer — based on lower gross pay)
- It DOES count toward the pension AA

---

## 19. Summary Totals

```
Total Tax = Income Tax + National Insurance (employee) + HICBC Charge

Effective Rate = Total Tax / Total Income × 100

Net Income = Total Income − Total Tax
```

Note: Employer NI is computed and reported but is NOT included in the client's total tax — it's a cost to the employer.

---

## 20. Worked Example — Full Computation

**Client**: Marcus Chen
- Employment: £145,000
- Rental: £18,000 (£6,000 expenses)
- Dividends: £32,500
- Region: England
- Salary sacrifice: £6,000 (employer pension)
- Personal pension contributions: £0
- 2 children, claims Child Benefit

### Step 1: Categorise Income

```
Employment (after sacrifice): £145,000 − £6,000 = £139,000
Rental (net): £18,000 − £6,000 = £12,000
Non-savings total: £139,000 + £12,000 = £151,000

Savings: £0
Dividends: £32,500

Total Income = £151,000 + £0 + £32,500 = £183,500
```

### Step 2: ANI

```
Personal pension contributions: £0
Gift Aid: £0
ANI = £183,500 − £0 − £0 = £183,500
```

### Step 3: Personal Allowance

```
ANI (£183,500) > £125,140 → PA = £0 (fully lost)
```

### Step 4: Income Tax

**Non-savings** (£151,000, PA = £0):

```
Taxable = £151,000 − £0 = £151,000

Basic Rate:      £37,700 × 20% = £7,540
Higher Rate:     £74,870 × 40% = £29,948
Additional Rate: £151,000 − £37,700 − £74,870 = £38,430 × 45% = £17,293

Non-savings tax = £7,540 + £29,948 + £17,293 = £54,781
```

**Savings** (£0): £0

**Dividends** (£32,500, entering at cursor position £151,000 — firmly in Additional Rate):

```
Dividend Allowance: first £500 at 0% = £0
Remaining: £32,000 × 39.35% = floor(£12,592) = £12,592

Dividend tax = £12,592
```

**Total Income Tax = £54,781 + £0 + £12,592 = £67,373**

### Step 5: National Insurance

**Class 1** (employment earnings = £139,000):

```
Main NI = (£50,270 − £12,570) × 8% = £37,700 × 0.08 = £3,016.00
Upper NI = (£139,000 − £50,270) × 2% = £88,730 × 0.02 = £1,774.60
Employee NI = £4,790.60

Employer NI = (£139,000 − £5,000) × 15% = £134,000 × 0.15 = £20,100.00
```

### Step 6: HICBC

```
ANI = £183,500 > £80,000 → 100% clawback

Child Benefit: £26.05 + £17.25 = £43.30/week × 52 = £2,251.60/year
HICBC Charge = £2,251.60 × 100% = £2,251.60
Net Benefit = £0
```

### Step 7: Pension AA

```
Total pension = £0 (personal) + £6,000 (employer/sacrifice) = £6,000

Threshold Income = £183,500 − £0 = £183,500 (< £200,000 → no taper)
AA = £60,000
Remaining = £60,000 − £6,000 = £54,000
```

### Step 8: Marginal Rate

```
ANI = £183,500 > £125,140 → not in taper zone
Highest non-savings band = Additional Rate (45%)
NI marginal = 2% (above UEL)
Marginal Rate = 45% + 2% = 47%
```

### Step 9: Summary

```
Income Tax:          £67,373.00
Employee NI:          £4,790.60
HICBC:                £2,251.60
─────────────────────────────────
Total Tax:           £74,415.20

Effective Rate:      £74,415.20 / £183,500 × 100 = 40.55%
Net Income:          £183,500 − £74,415.20 = £109,084.80

(Employer NI:        £20,100.00 — not included in client's total)
```

---

## 21. Constants Reference

All values for **2025/26**.

### Income Tax

| Constant | Value |
|----------|------:|
| Personal Allowance | £12,570 |
| PA taper threshold | £100,000 |
| PA fully lost at | £125,140 |
| Basic Rate band width | £37,700 |
| Basic Rate | 20% |
| Higher Rate band width | £74,870 |
| Higher Rate | 40% |
| Additional Rate | 45% |

### Scottish Income Tax

| Band | Width | Rate |
|------|------:|-----:|
| Starter | £2,306 | 19% |
| Basic | £11,685 | 20% |
| Intermediate | £17,101 | 21% |
| Higher | £31,338 | 42% |
| Advanced | £50,140 | 45% |
| Top | Unlimited | 48% |

### National Insurance

| Constant | Value |
|----------|------:|
| Class 1 Primary Threshold | £12,570 |
| Class 1 Upper Earnings Limit | £50,270 |
| Class 1 Employee Main Rate | 8% |
| Class 1 Employee Upper Rate | 2% |
| Class 1 Employer Secondary Threshold | £5,000 |
| Class 1 Employer Rate | 15% |
| Class 2 Weekly Rate | £3.45 |
| Class 2 Profit Threshold | £12,570 |
| Class 4 Lower Profits Limit | £12,570 |
| Class 4 Upper Profits Limit | £50,270 |
| Class 4 Main Rate | 6% |
| Class 4 Upper Rate | 2% |

### Dividends

| Constant | Value |
|----------|------:|
| Dividend Allowance | £500 |
| Basic Rate | 8.75% |
| Higher Rate | 33.75% |
| Additional Rate | 39.35% |

### Savings

| Constant | Value |
|----------|------:|
| PSA (basic rate taxpayer) | £1,000 |
| PSA (higher rate taxpayer) | £500 |
| PSA (additional rate taxpayer) | £0 |
| Starting Rate Band | £5,000 |

### HICBC

| Constant | Value |
|----------|------:|
| Start threshold | £60,000 |
| Full clawback threshold | £80,000 |
| Child Benefit weekly (first child) | £26.05 |
| Child Benefit weekly (additional child) | £17.25 |

### Pension

| Constant | Value |
|----------|------:|
| Annual Allowance | £60,000 |
| Minimum Tapered AA | £10,000 |
| Money Purchase AA (MPAA) | £10,000 |
| Taper: Threshold Income | £200,000 |
| Taper: Adjusted Income | £260,000 |
| Lump Sum Allowance | £268,275 |
| Lump Sum & Death Benefit Allowance | £1,073,100 |

### AA History (for carry forward)

| Tax Year | Annual Allowance |
|----------|----------------:|
| 2024/25 | £60,000 |
| 2023/24 | £60,000 |
| 2022/23 | £40,000 |

### Other Allowances

| Allowance | Value |
|-----------|------:|
| ISA | £20,000 |
| LISA | £4,000 |
| Junior ISA | £9,000 |
| CGT Annual Exempt Amount | £3,000 |
| CGT Basic Rate | 18% |
| CGT Higher Rate | 24% |
| Marriage Allowance Transfer | £1,260 |
| Trading Allowance | £1,000 |
| Property Allowance | £1,000 |
| Rent-a-Room Relief | £7,500 |

### IHT

| Constant | Value |
|----------|------:|
| Nil Rate Band | £325,000 |
| Residence NRB | £175,000 |
| Rate | 40% |
| Max tax-free (couple, with RNRB) | £1,000,000 |

---

## Questions for Adviser Review

1. **PA taper rounding**: We use `floor(excess / 2)` per HMRC guidance — incomplete £2 increments don't reduce the PA. Is this consistent with your understanding?

2. **Income tax per-band truncation**: We truncate each band's tax to whole pounds before summing (HMRC SA method). Do you agree this is correct rather than rounding?

3. **HICBC clawback**: We use `floor((ANI − £60,000) / £200)` for the percentage — 1% per complete £200. Can you confirm this matches the Self Assessment calculation?

4. **Salary sacrifice treatment**: We pass sacrifice as `employer_contributions` (not personal contributions), meaning it does NOT extend the Basic Rate Band and does NOT reduce ANI directly (the reduced salary achieves the ANI reduction). Is this the correct treatment?

5. **Pension AA taper inputs**: We compute Threshold Income as `Total Income − Personal Contributions` and Adjusted Income as `Total Income + Employer Contributions`. Does this align with HMRC's definition?

6. **Employer NI threshold**: We use £5,000 as the 2025/26 employer secondary threshold (changed from £9,100 in 2024/25) and 15% rate (up from 13.8%). Can you confirm these are the correct 2025/26 figures?

7. **Scottish dividend rates**: We apply UK dividend rates (not Scottish rates) to dividends for Scottish taxpayers. This is our understanding of the current rules — can you confirm?

8. **BRB extension**: We extend the Basic Rate Band for BOTH grossed-up Gift Aid AND gross personal pension contributions. Is this correct that both extend the BRB?
