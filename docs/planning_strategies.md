# UK Hazel — Tax Planning Strategies & Scenarios

> All UK tax planning strategies, worked examples, common scenarios, and dashboard prototypes.

---

## Table of Contents

1. [The 60% Tax Trap (PA Taper)](#1-the-60-tax-trap-personal-allowance-taper)
2. [High Income Child Benefit Charge](#2-high-income-child-benefit-charge-hicbc)
3. [Pension Annual Allowance & Carry Forward](#3-pension-annual-allowance--carry-forward)
4. [Salary Sacrifice](#4-salary-sacrifice)
5. [Investment Wrapper Priority](#5-investment-wrapper-priority-isa-vs-pension-vs-gia)
6. [Bed & ISA Strategy](#6-bed--isa-strategy)
7. [Spousal Planning](#7-spousal-planning)
8. [Director Remuneration](#8-director-remuneration-optimisation)
9. [Gift Aid](#9-gift-aid)
10. [CGT Annual Exempt Harvesting](#10-cgt-annual-exempt-amount-harvesting)
11. [Inheritance Tax Planning](#11-inheritance-tax-planning)
12. [Common Scenarios](#common-planning-scenarios)
13. [Dashboard Prototypes](#dashboard-prototypes)

---

## 1. THE 60% TAX TRAP (Personal Allowance Taper)

**This is the single most important UK tax planning consideration.**

### How It Works
- Personal Allowance (£12,570) is reduced by £1 for every £2 of income over £100,000
- Fully lost when income reaches £125,140
- Creates an **effective 62% marginal rate** in the taper zone:
  - 40% income tax
  - 2% National Insurance
  - 20% effective rate from losing PA (40% × 50%)

### Always Check
Is the client's Adjusted Net Income between £100,000 and £125,140?

### ANI Calculation

```
Total Income
MINUS: Gross pension contributions (personal, not employer)
MINUS: Gross Gift Aid donations (donation ÷ 0.8)
= Adjusted Net Income
```

### Mitigation Strategies (in order of effectiveness)
1. Pension contributions (salary sacrifice is best — saves NI too)
2. Employer pension contributions (don't count as income at all)
3. Gift Aid donations (extend basic rate band)
4. Timing income across tax years

### Worked Example

```
Client earns £120,000
PA reduced by: (£120,000 - £100,000) ÷ 2 = £10,000
Remaining PA: £12,570 - £10,000 = £2,570

If client makes £20,000 pension contribution:
New ANI: £120,000 - £20,000 = £100,000
Full PA restored: £12,570

Tax saving:
- PA restored: £10,000 × 40% = £4,000
- Higher rate relief on pension: £20,000 × 40% = £8,000
- Total benefit: £12,000 on £20,000 contribution = 60% effective relief!
```

### Another Example — Full Scenario

```
Income: £120,000
Personal Allowance reduced by £9,715
Extra tax on £9,715 at 40% = £3,886
Pension contribution of £20,000 → restores £10,000 PA
Net benefit: £3,886 + £8,000 tax relief = £11,886
```

---

## 2. HIGH INCOME CHILD BENEFIT CHARGE (HICBC)

### How It Works
If either parent has income over £60,000 and the household claims Child Benefit:
- 1% of Child Benefit clawed back for every £200 over £60,000
- 100% clawed back at £80,000
- Based on **INDIVIDUAL** income, not household income

### 2025/26 Child Benefit Rates
- First child: £25.60/week (£1,331.20/year)
- Each subsequent child: £16.95/week (£881.40/year)

### Worked Example

```
2 children = £2,212.60/year benefit
Higher earner income: £70,000
Clawback: (£70,000 - £60,000) ÷ £200 = 50 × 1% = 50%
Charge: £2,212.60 × 50% = £1,106.30

Mitigation:
£10,000 pension contribution → income £60,000 → keep full benefit
Total benefit of pension: £4,000 tax relief + £1,106 HICBC avoided = £5,106
```

---

## 3. PENSION ANNUAL ALLOWANCE & CARRY FORWARD

### Standard Annual Allowance: £60,000

### Carry Forward — Use unused AA from 3 prior years

| Year | AA | Used | Unused | Status |
|------|----|------|--------|--------|
| 2022/23 | £40,000 | £10,000 | £30,000 | Available now |
| 2023/24 | £60,000 | £15,000 | £45,000 | Available now |
| 2024/25 | £60,000 | £20,000 | £40,000 | Available now |
| 2025/26 | £60,000 | — | — | Current year |
| **Total available** | | | **£175,000** | |

**Planning tip:** Big bonus year? Max pension to wipe out higher rate tax.

### Tapered AA (High Earners)
- If "Threshold Income" > £200,000 AND "Adjusted Income" > £260,000
- AA reduced by £1 for every £2 over £260,000
- Minimum tapered AA: £10,000

### MPAA
- £10,000 if flexibly accessed pension benefits
- Cannot use carry forward

---

## 4. SALARY SACRIFICE

### How It Works
Employee agrees to reduce salary; employer puts the amount into pension instead.

### Savings

| Component | Saving |
|-----------|--------|
| Income Tax | Up to 45% |
| Employee NI | 2% (above UEL) or 8% (below) |
| Employer NI | 13.8% (employer may share this) |
| **Total potential** | **Up to 60.8%** |

Plus: Reduces income for PA taper, HICBC, pension taper calculations.

### Worked Example

```
Higher rate taxpayer sacrifices £10,000:
- Income tax saved: £4,000 (40%)
- Employee NI saved: £200 (2%)
- Employer NI saved: £1,380 (often passed to employee's pension)
- Plus potential PA restoration benefits
- Total effective relief can exceed 60%
```

### Warnings
- Reduces gross salary (affects mortgage applications)
- May affect life insurance, sick pay if based on salary
- Cannot sacrifice below National Minimum Wage

---

## 5. INVESTMENT WRAPPER PRIORITY (ISA vs Pension vs GIA)

Recommended order:
1. **Employer pension match** — Free money, always take it
2. **Pension contributions** — Highest tax relief, especially in 60% trap
3. **LISA** — If eligible (<40, first home or retirement), 25% bonus
4. **ISA** — Flexible access, tax-free growth, no income limits
5. **GIA** — Taxable, use CGT AEA annually

---

## 6. BED & ISA STRATEGY

### How It Works
1. Identify holdings with unrealised gains in GIA
2. Sell enough to realise gains up to £3,000 (AEA)
3. No CGT payable (within AEA)
4. Repurchase same/similar investments within ISA
5. Future growth is now tax-free forever
6. Repeat annually with each spouse

### 30-Day "Bed and Breakfast" Rule
If you sell and rebuy **identical** shares within 30 days, HMRC treats it as if you never sold.

### Workarounds
- Buy similar but not identical fund (e.g., different provider's global tracker)
- Spouse buys back (spousal transfer then spouse sells = uses their AEA)
- Wait 30 days (if market timing acceptable)

---

## 7. SPOUSAL PLANNING

Because UK taxes individuals separately:

- **Asset transfers:** No CGT on transfers between spouses
- **Income splitting:** Transfer income-producing assets to lower-earning spouse
- **CGT doubling:** Each spouse has £3,000 AEA = £6,000 combined
- **ISA doubling:** Each spouse has £20,000 = £40,000 combined
- **Pension contributions:** Higher earner can fund lower earner's pension

---

## 8. DIRECTOR REMUNERATION OPTIMISATION

### Optimal Salary Level
Usually £12,570 (NI threshold):
- No income tax, no employee NI
- Employer NI: ~£479 (above secondary threshold)
- Preserves state pension credits

### Salary vs Dividend Comparison

| Method | Tax Rate | Total Rate (incl Corp Tax) |
|--------|----------|----------------------------|
| Salary (basic) | 20% + 8% NI | 28% + 13.8% ER NI = 41.8% |
| Dividend (basic) | 8.75% | 25% CT + 8.75% = 32.1% |
| Salary (higher) | 40% + 2% NI | 42% + 13.8% ER NI = 55.8% |
| Dividend (higher) | 33.75% | 25% CT + 33.75% = 50.3% |

### Typical Optimal Structure

```
Salary: £12,570
- Income tax: £0 (within PA)
- Employee NI: £0 (below threshold)
- Employer NI: ~£479

Dividends: As required
- Within basic rate band: 8.75%
- Higher rate: 33.75%
- Already paid Corp Tax (25%)
```

---

## 9. GIFT AID

- Charity claims back the 20% basic rate tax (£80 donation = £100 to charity)
- Higher/additional rate taxpayers claim the difference on their return
- Gift Aid donations **reduce ANI** — tool for PA restoration
- Gift Aid also **extends the basic rate band**

---

## 10. CGT ANNUAL EXEMPT AMOUNT HARVESTING

**£3,000 per person per year — use it or lose it!**

### Strategies
- Crystallise gains up to £3,000 annually
- Transfer assets to spouse to double exemption (£6,000 couple)
- Bed and ISA (sell, rebuy in ISA)
- Bed and SIPP (sell, contribute to pension)
- Bed and spouse (transfer, they sell, rebuy)

**WARNING:** 30-day "same day" and "bed and breakfast" rules apply.

---

## 11. INHERITANCE TAX PLANNING

### Planning Tools
- Annual exemption: £3,000/year gifts (carry 1 year)
- Small gifts: £250/person unlimited recipients
- Wedding gifts: £5k (child), £2.5k (grandchild), £1k (other)
- Normal expenditure out of income (unlimited if regular)
- PETs: IHT-free if donor survives 7 years
- Business Property Relief: 100% on qualifying businesses
- Agricultural Property Relief: 100% on farmland
- Life insurance in trust to cover IHT liability

---

## Common Planning Scenarios

### Scenario 1: Higher Earner in PA Taper Zone

**Indicators:** ANI £100,000 - £125,140
**Priority:** CRITICAL

**Analysis:**
1. Calculate exact PA reduction
2. Calculate effective marginal rate (62%)
3. Model pension contribution to restore PA
4. Check pension AA availability (including carry forward)
5. Model salary sacrifice if available (adds NI saving)
6. Check HICBC interaction

**Output format:**

```
Current position:
- ANI: £115,000
- PA: £5,355 (reduced from £12,570)
- Effective marginal rate: 62%

Recommended action:
- Pension contribution: £15,000
- New ANI: £100,000
- PA restored: £12,570

Tax saving:
- PA restoration: £2,886
- Higher rate relief: £6,000
- Total: £8,886 on £15,000 = 59% effective relief
```

### Scenario 2: Company Director Remuneration

**Indicators:** Owner-director of limited company
**Priority:** HIGH

**Analysis:**
1. Identify optimal salary level (usually £12,570)
2. Calculate dividend capacity
3. Compare total tax (Corp Tax + personal)
4. Consider pension contributions via company
5. Model salary sacrifice opportunities

### Scenario 3: Tax Year End Planning (approaching 5 April)

**Indicators:** Date is January-April
**Priority:** HIGH (time-sensitive)

**Standard checklist:**
- Max ISA contributions (£20,000 each)
- Use CGT AEA (£3,000 each) — Bed & ISA
- Pension contributions (check AA)
- Make IHT annual gifts (£3,000 each)
- Review dividend timing
- Complete Gift Aid donations

---

## Dashboard Prototypes

### 1. PA Taper Zone Alert

```
┌──────────────────────────────────────────────────────┐
│  CRITICAL: PA TAPER ZONE DETECTION                   │
│                                                      │
│  ⚠️ Client is in the 60% marginal rate zone!         │
│                                                      │
│  Current ANI: £115,000                               │
│  Personal Allowance: £5,355 (reduced from £12,570)   │
│  Effective marginal rate: 62%                        │
│                                                      │
│  RECOMMENDATION: Pension contribution of £15,000     │
│  → Restores full PA (£12,570)                        │
│  → Tax saving: £9,300 (62% effective rate)           │
│  → Plus: £6,000 tax relief on the contribution       │
│  → Total benefit: £15,300 on £15,000 contribution!   │
└──────────────────────────────────────────────────────┘
```

### 2. HICBC Optimiser

```
┌──────────────────────────────────────────────────────┐
│  HIGH INCOME CHILD BENEFIT CHARGE                    │
│                                                      │
│  Higher earner income: £70,000                       │
│  Children: 2                                         │
│  Annual Child Benefit: £2,212.60                     │
│  HICBC clawback: 50% = £1,106.30                    │
│                                                      │
│  RECOMMENDATION: Pension contribution of £10,000     │
│  → Reduces adjusted income to £60,000                │
│  → Retains full Child Benefit: £2,212.60             │
│  → Plus pension tax relief: £4,000                   │
│  → Total benefit: £6,212.60                          │
└──────────────────────────────────────────────────────┘
```

### 3. Tax Year End Countdown

```
┌──────────────────────────────────────────────────────┐
│  🗓️ TAX YEAR END: 5 APRIL 2026                       │
│  ⏰ Days remaining: 48                                │
│                                                      │
│  URGENT ACTIONS:                                     │
│                                                      │
│  Allowance         │ Remaining │ Action              │
│  ──────────────────┼───────────┼──────────────────── │
│  ISA               │ £8,500    │ Transfer from GIA   │
│  Pension AA        │ £45,000   │ Employer contr.     │
│  CGT Annual Exempt │ £3,000    │ Bed & ISA           │
│  IHT Annual Gift   │ £3,000    │ Gift to children    │
│  Dividend Allow.   │ £200      │ Review timing       │
│                                                      │
│  ⚠️ These cannot be carried forward — use or lose!   │
└──────────────────────────────────────────────────────┘
```

### 4. Scottish Tax Comparison

```
┌──────────────────────────────────────────────────────┐
│  SCOTTISH vs REST OF UK COMPARISON                   │
│                                                      │
│  Income: £60,000                                     │
│                                                      │
│  Band              │ rUK Rate │ Scotland │ Diff      │
│  ──────────────────┼──────────┼──────────┼────────── │
│  £12,571-£14,876   │ 20%      │ 19%      │ -£23      │
│  £14,877-£26,561   │ 20%      │ 20%      │ £0        │
│  £26,562-£43,662   │ 20%      │ 21%      │ +£171     │
│  £43,663-£50,270   │ 20%      │ 42%      │ +£1,454   │
│  £50,271-£60,000   │ 40%      │ 42%      │ +£195     │
│  ──────────────────┼──────────┼──────────┼────────── │
│  TOTAL TAX         │ £11,432  │ £13,229  │ +£1,797   │
│                                                      │
│  Note: NI, dividends, CGT are UK-wide rates          │
└──────────────────────────────────────────────────────┘
```
