# UK Tax Glossary — Plain English for Engineers

> Every buzzword, acronym, document, and concept you'll hit while building UK Hazel. Written for someone who knows code, not tax.

---

## Table of Contents

1. [The Big Picture Concepts](#the-big-picture-concepts)
2. [Tax Authorities & Systems](#tax-authorities--systems)
3. [Types of Tax](#types-of-tax)
4. [Income Tax Concepts](#income-tax-concepts)
5. [National Insurance (NI)](#national-insurance-ni)
6. [Pensions](#pensions)
7. [ISAs (Tax-Free Savings)](#isas-tax-free-savings)
8. [Capital Gains Tax (CGT)](#capital-gains-tax-cgt)
9. [Dividends](#dividends)
10. [Child Benefit & HICBC](#child-benefit--hicbc)
11. [Inheritance Tax (IHT)](#inheritance-tax-iht)
12. [Company / Director Terms](#company--director-terms)
13. [Tax Documents & Forms](#tax-documents--forms)
14. [Planning Strategies (Buzzwords)](#planning-strategies-buzzwords)
15. [Key Thresholds (The Magic Numbers)](#key-thresholds-the-magic-numbers)
16. [Organisations & Regulators](#organisations--regulators)
17. [People & Roles](#people--roles)

---

## The Big Picture Concepts

### Tax Year
- **What:** The annual period taxes are calculated over.
- **UK:** 6 April to 5 April (e.g., "2025/26" = 6 April 2025 to 5 April 2026).
- **Why it's weird:** Historical reason from 1752 calendar change. Just accept it.
- **Why you care:** Every allowance, rate, and deadline is tied to this period. Many allowances expire on 5 April and can't be recovered.

### Individual Taxation
- **What:** In the UK, every person is taxed completely on their own. There is no concept of joint filing.
- **Why you care:** A married couple has two separate sets of everything — allowances, bands, rates. This creates planning opportunities (transfer assets between spouses to use both sets).

### Progressive Taxation
- **What:** You don't pay one flat rate on all your income. Instead, different slices of income are taxed at different rates. The first slice is free (Personal Allowance), then 20%, then 40%, then 45%.
- **Think of it like:** Array slicing. `income[0:12570]` taxed at 0%, `income[12571:50270]` taxed at 20%, etc.

### Allowance
- **What:** An amount of something you can earn/receive/contribute tax-free each year.
- **Example:** ISA Allowance = £20,000 you can put into an ISA this tax year.
- **Key thing:** Most allowances are "use it or lose it" — they don't roll over to next year.

### Tax Relief
- **What:** The government gives you back some tax you would have paid, as an incentive. Pension contributions get tax relief = you get money back (or pay less tax) when you put money into a pension.
- **Think of it like:** A discount on your tax bill.

### Marginal Rate
- **What:** The tax rate on your *next* pound of income. Not the average rate on all your income.
- **Why you care:** This is what matters for planning. If someone's marginal rate is 62% (the PA taper zone), every extra £1 of pension contribution effectively saves them 62p.

### Effective Rate
- **What:** Your total tax divided by your total income. The "real" average rate you actually pay.
- **Example:** Someone earning £60,000 pays roughly £11,432 income tax = ~19% effective rate, even though their marginal rate is 40%.

---

## Tax Authorities & Systems

### HMRC — His Majesty's Revenue and Customs
- **What:** The UK's tax authority. The one and only. Collects income tax, NI, VAT, corporation tax, etc.
- **Think of it as:** The IRS, but for the whole UK. No state agencies to worry about.
- **Website:** gov.uk/hmrc

### PAYE — Pay As You Earn
- **What:** The system where your employer deducts income tax and NI from your salary *before* you receive it, every pay period.
- **Think of it as:** Real-time tax withholding. The employer sends it straight to HMRC.
- **Why you care:** Most employees never need to file a tax return because PAYE handles everything automatically. Only people with complex affairs need Self Assessment.

### Self Assessment (SA)
- **What:** The annual tax return process where you report your income and calculate your tax yourself (or your accountant does).
- **Who needs it:** Self-employed people, company directors, anyone earning over ~£150k, anyone with rental income, capital gains, foreign income, etc.
- **Deadline:** 31 January following the tax year (so for 2025/26, deadline is 31 January 2027).
- **Think of it as:** Filing your taxes, but only some people have to do it.

### Tax Code
- **What:** A code assigned to each employee (e.g., "1257L") that tells the employer how much tax-free income to give before deducting tax.
- **"1257L"** means: "This person gets £12,570 tax-free." The "L" is the category.
- **Why you care:** If HMRC gets the tax code wrong, the person pays too much or too little tax throughout the year.

### Payment on Account (POA)
- **What:** Advance payments towards your next year's tax bill, based on this year's bill. HMRC makes you pay in two instalments (31 January and 31 July).
- **Think of it as:** Prepaying estimated tax in instalments.

---

## Types of Tax

### Income Tax
- **What:** Tax on your income (salary, self-employment profits, pension, rental income, etc.).
- **Rates (2025/26):** 0% (first £12,570), 20%, 40%, 45%.

### National Insurance Contributions (NICs)
- **What:** A separate tax on earnings that funds the state pension and some benefits. It's calculated differently from income tax (see NI section below).
- **Key difference from income tax:** NI has different thresholds and rates, and there are different "classes" for employees vs self-employed.

### Capital Gains Tax (CGT)
- **What:** Tax on the profit when you sell an asset (shares, property, etc.) for more than you paid.

### Inheritance Tax (IHT)
- **What:** Tax on someone's estate (everything they own) when they die, if it's over the threshold.

### Corporation Tax (CT)
- **What:** Tax on a company's profits. Currently 25% for profits over £250k.
- **Why you care:** For company directors, the interplay between corporation tax, salary, and dividends is a key planning area.

### VAT — Value Added Tax
- **What:** A sales tax of 20% on most goods and services. Businesses collect it and pay it to HMRC.
- **Why you care:** Relevant for self-employed people and directors — if their turnover exceeds £90,000 they must register for VAT.

### Stamp Duty Land Tax (SDLT)
- **What:** A tax you pay when you buy property in England or Northern Ireland (Scotland has LBTT, Wales has LTT).
- **Why you care:** It's a one-off cost on property purchase, not ongoing. Relevant for IHT and wealth planning.

---

## Income Tax Concepts

### Personal Allowance (PA)
- **What:** The amount of income you can earn completely tax-free each year. Currently £12,570.
- **The trap:** If you earn over £100,000, you start losing it. For every £2 over £100k, you lose £1 of PA. At £125,140, it's completely gone. This creates the "60% tax trap."
- **Think of it as:** A tax-free buffer that gets clawed back from high earners.

### Personal Allowance Taper
- **What:** The mechanism that reduces your Personal Allowance when you earn over £100,000.
- **Formula:** `PA_remaining = max(0, 12570 - ((ANI - 100000) / 2))`
- **Why it matters:** It creates an effective 62% marginal tax rate between £100k and £125,140. This is the #1 tax planning concern in the UK.

### Adjusted Net Income (ANI)
- **What:** The number HMRC uses to determine whether your Personal Allowance gets tapered. It's NOT the same as your gross income.
- **Formula:** `ANI = Total_Income - Pension_Contributions_Gross - Gift_Aid_Gross`
- **Why you care:** This is the key number for PA taper planning. If you can get ANI below £100k (by making pension contributions), you keep the full PA.
- **Think of it as:** Your "real" income for PA purposes, after deducting tax-efficient contributions.

### Taxable Income
- **What:** Your income after deducting the Personal Allowance. This is what actually gets taxed.
- **Formula:** `Taxable_Income = ANI - Personal_Allowance`

### Total Income
- **What:** All your income from every source added together, before any deductions.
- **Includes:** Employment, self-employment, dividends, interest, rental income, pension income, etc.

### Basic Rate / Higher Rate / Additional Rate
- **What:** The three main tax bands in England/Wales/NI.
  - **Basic Rate:** 20% on income £12,571 - £50,270
  - **Higher Rate:** 40% on income £50,271 - £125,140
  - **Additional Rate:** 45% on income over £125,140
- **Think of it as:** Tax brackets. Same concept as US, just different names and thresholds.

### Scottish Rates
- **What:** Scotland sets its own income tax rates, which are different from the rest of the UK. They have 6 bands instead of 3 (Starter 19%, Basic 20%, Intermediate 21%, Higher 42%, Advanced 45%, Top 48%).
- **Why you care:** You must always check if the client lives in Scotland. It changes the entire tax calculation.
- **Important:** Scottish rates only apply to non-savings, non-dividend income. Savings interest and dividends use UK-wide rates.

### Basic Rate Band
- **What:** The range of income taxed at 20% (£12,571 - £50,270). This band can be "extended" by Gift Aid donations, meaning more income falls into the 20% zone instead of 40%.

### Income Ordering
- **What:** The order in which different types of income are stacked up and taxed.
- **Order:** 1) Non-savings income first, 2) Savings interest, 3) Dividends last.
- **Why you care:** This determines which income "uses up" the Personal Allowance and basic rate band first. Since dividends are taxed last, they often fall into higher bands even if the amounts are small.

### Marriage Allowance
- **What:** If one spouse earns below the Personal Allowance and the other is a basic rate taxpayer, the low-earner can transfer £1,260 of their unused PA to the higher earner.
- **Saving:** £1,260 × 20% = £252 per year.
- **Limitation:** Only works if the recipient is a basic rate taxpayer (not higher or additional rate).

### Blind Person's Allowance
- **What:** An extra tax-free allowance of £3,070 for registered blind people.

### Trading Allowance
- **What:** The first £1,000 of self-employment or casual income is tax-free. No need to report it if under £1,000.

### Property Allowance
- **What:** The first £1,000 of rental income is tax-free. Same concept as trading allowance.

---

## National Insurance (NI)

### National Insurance Contributions (NICs)
- **What:** A separate tax on earnings (on top of income tax) that funds state pension and some benefits.
- **Why it's confusing:** It has completely different thresholds and rates from income tax, and there are different "classes" depending on how you earn.

### NI Number (National Insurance Number)
- **What:** A unique identifier for every person in the UK tax system. Format: `AB 12 34 56 C`.
- **Think of it as:** Social Security Number (US equivalent).

### Class 1 NICs (Employees)
- **What:** NI deducted from employee wages. Both the employee AND the employer pay.
- **Employee rates:** 0% up to £12,570, then 8% up to £50,270, then 2% above.
- **Employer rate:** 13.8% on everything above £9,100.
- **Why you care:** Salary sacrifice saves BOTH employee NI (8%/2%) and employer NI (13.8%).

### Class 2 NICs (Self-Employed)
- **What:** A flat-rate weekly contribution self-employed people pay. £3.45/week if profits > £12,570.
- **Why it exists:** Maintains state pension entitlement for self-employed people.

### Class 4 NICs (Self-Employed)
- **What:** Profit-based NI for the self-employed. 6% on profits £12,570-£50,270, then 2% above.
- **Think of it as:** The self-employed equivalent of Class 1.

### Primary Threshold
- **What:** The point where employees start paying Class 1 NI. Currently £12,570 (aligned with the Personal Allowance).

### Upper Earnings Limit (UEL)
- **What:** The point where employee NI drops from 8% to 2%. Currently £50,270 (aligned with the higher rate threshold).

### Secondary Threshold
- **What:** The point where employers start paying NI on employee earnings. Currently £9,100.
- **Why you care:** Employer NI at 13.8% is a significant cost. Salary sacrifice avoids this entirely.

### Employer's NI
- **What:** The 13.8% NI the employer pays on employee earnings above £9,100. The employee never sees this — it's an additional cost to the employer.
- **Why you care:** In salary sacrifice arrangements, the employer saves this 13.8% and may share the saving with the employee (usually by adding it to the pension).

---

## Pensions

### Pension
- **What:** A tax-advantaged savings wrapper for retirement. Money goes in with tax relief, grows tax-free, and is taxed as income when you take it out (except 25% tax-free lump sum).
- **Think of it as:** A 401(k) equivalent, but with no required minimum withdrawals.

### Workplace Pension
- **What:** A pension provided through your employer. Employer must auto-enrol you and contribute at least 3% of qualifying earnings.

### DC — Defined Contribution
- **What:** A pension where you (and your employer) contribute money, it's invested, and what you get at retirement depends on how the investments performed.
- **Think of it as:** A pot of money that goes up and down with the market.

### DB — Defined Benefit (Final Salary)
- **What:** A pension where the employer promises you a specific income in retirement, based on your salary and years of service.
- **Think of it as:** A guaranteed income for life. Much more valuable (and rare) than DC.

### SIPP — Self-Invested Personal Pension
- **What:** A pension you set up and manage yourself, choosing your own investments.
- **Think of it as:** A DIY pension account. Like a self-directed IRA.

### SSAS — Small Self-Administered Scheme
- **What:** A pension scheme for small businesses (typically owner-directors) with more investment flexibility (can buy commercial property, lend to the sponsoring company, etc.).

### Annual Allowance (AA)
- **What:** The maximum amount that can be contributed to all your pensions in a tax year. Currently £60,000 (total of employee + employer contributions).
- **Why you care:** Exceeding it triggers a tax charge. But unused AA from the past 3 years can be carried forward.

### Carry Forward
- **What:** If you didn't use your full pension Annual Allowance in the previous 3 tax years, you can use the unused portion now.
- **Example:** If you only contributed £20,000 each year for 3 years (AA was £60,000), you have £120,000 of unused AA you can use this year on top of the current £60,000 = £180,000 total.
- **Why you care:** This is how people make very large one-off pension contributions in a big bonus year.

### Tapered Annual Allowance
- **What:** For very high earners (threshold income > £200k AND adjusted income > £260k), the AA is reduced. It drops by £1 for every £2 of adjusted income over £260k, down to a minimum of £10,000.

### MPAA — Money Purchase Annual Allowance
- **What:** If you've already started flexibly withdrawing from your pension, your annual allowance drops from £60,000 to just £10,000, and you can't use carry forward.
- **When it's triggered:** Taking income from a drawdown pension (but NOT taking the 25% tax-free lump sum on its own).

### PCLS — Pension Commencement Lump Sum
- **What:** The 25% of your pension pot you can take out completely tax-free when you start accessing your pension.
- **Also known as:** Tax-free lump sum, or "the 25%."

### Lump Sum Allowance (LSA)
- **What:** The maximum tax-free lump sum you can take across all your pensions. £268,275 (replaced the old Lifetime Allowance from April 2024).

### Lump Sum and Death Benefit Allowance (LSDBA)
- **What:** The maximum combined tax-free lump sums (including death benefits) across all pensions. £1,073,100.

### Lifetime Allowance (LTA)
- **What:** **ABOLISHED** from April 2024. It used to be a cap on total pension savings (above which you were taxed heavily). Replaced by LSA and LSDBA.

### Pension Tax Relief
- **What:** When you put money in a pension, the government adds back the tax you paid on that income.
- **How it works:** If you contribute £80 net, the pension provider claims £20 from HMRC (basic rate relief) making it £100 gross. If you're a higher rate taxpayer, you claim another £20 back on your tax return. Net cost to you: £60 for £100 in your pension.
- **In the 60% trap zone:** You effectively get ~60% relief, meaning £100 in your pension only costs you ~£40.

### Salary Sacrifice
- **What:** You agree with your employer to reduce your salary, and the employer puts that amount into your pension instead.
- **Why it's special:** Because the money never counts as your income, you save income tax AND NI (both employee and employer). It also reduces your ANI, which can restore your Personal Allowance and avoid HICBC.
- **Think of it as:** The most tax-efficient way to make pension contributions in the UK.

### Drawdown (Flexible Drawdown / Flexi-Access Drawdown)
- **What:** Taking money out of your pension pot in flexible amounts (as much or as little as you want). The withdrawals are taxed as income.
- **Alternative:** Buying an annuity (guaranteed income for life).

### Annuity
- **What:** Using your pension pot to buy a guaranteed income for life from an insurance company. Once bought, it's irreversible.

### State Pension
- **What:** The government pension everyone gets if they've paid enough NI contributions (35 qualifying years for full amount). Currently ~£11,500/year.
- **Why you care:** It counts as taxable income.

---

## ISAs (Tax-Free Savings)

### ISA — Individual Savings Account
- **What:** A tax-free wrapper for savings and investments. Everything inside an ISA (interest, dividends, capital gains) is completely tax-free, forever.
- **Annual limit:** £20,000 per person per tax year. Cannot carry forward unused allowance.
- **Think of it as:** A Roth IRA but much more flexible — no income limits, no age restrictions, you can withdraw any time without penalty.

### Cash ISA
- **What:** An ISA that works like a savings account. Interest earned is tax-free.

### Stocks & Shares ISA (S&S ISA)
- **What:** An ISA where you invest in funds, shares, bonds, etc. All dividends and capital gains are tax-free.

### LISA — Lifetime ISA
- **What:** A special ISA for people aged 18-39. You can put in up to £4,000/year (counts within your £20,000 ISA limit), and the government adds a 25% bonus (i.e., £1,000 free money on a £4,000 contribution).
- **Catch:** Can only be withdrawn penalty-free for buying your first home or after age 60. Withdraw for any other reason and you lose the bonus plus a penalty.

### Junior ISA (JISA)
- **What:** An ISA for children (under 18). £9,000 annual limit. Child can access it at 18.

### Innovative Finance ISA (IFISA)
- **What:** An ISA for peer-to-peer lending investments. Less common.

### GIA — General Investment Account
- **What:** A normal, taxable investment account. NOT an ISA. Dividends and capital gains are taxable.
- **Why you care:** The Bed & ISA strategy involves selling investments in a GIA and rebuying them inside an ISA to shelter them from future tax.

---

## Capital Gains Tax (CGT)

### Capital Gain
- **What:** The profit when you sell an asset for more than you paid for it.
- **Formula:** `Gain = Sale_Price - Purchase_Price - Allowable_Costs`

### Capital Loss
- **What:** The opposite — selling for less than you paid. Losses can be offset against gains to reduce your CGT bill. Unused losses can be carried forward indefinitely.

### Annual Exempt Amount (AEA)
- **What:** The amount of capital gains you can make each year tax-free. Currently £3,000 per person. Use it or lose it — cannot carry forward.
- **Also called:** CGT Annual Exemption.

### Cost Basis
- **What:** The original purchase price of an asset, used to calculate the gain when you sell.
- **UK quirk:** For shares, the UK uses "Section 104 pooling" — all shares of the same type are averaged together into a single pool, rather than tracked individually (unlike the US lot-based system).

### Section 104 Pool / Share Pooling
- **What:** The UK method for calculating the cost basis of shares. All purchases of the same share are pooled together and averaged.
- **Example:** Buy 100 shares at £1, then 100 more at £3. Your pool is 200 shares at average cost £2 each.

### Bed and Breakfast Rule
- **What:** If you sell shares and buy back **identical** shares within 30 days, HMRC ignores the sale for CGT purposes (treats it as if you never sold).
- **Why it exists:** To stop people selling on 4 April to use their AEA and rebuying on 6 April.

### BADR — Business Asset Disposal Relief
- **What:** A reduced CGT rate (10% instead of 18%/24%) when you sell all or part of a qualifying business, up to a £1m lifetime limit.
- **Previously called:** Entrepreneurs' Relief.

### Investors' Relief
- **What:** Similar to BADR but for external investors in unlisted trading companies. 10% rate up to £10m lifetime limit.

### Rollover Relief
- **What:** Allows you to defer CGT when you sell a business asset and reinvest the proceeds in a new business asset.

### Principal Private Residence Relief (PPR)
- **What:** Your main home is exempt from CGT when you sell it. No tax on the gain.

---

## Dividends

### Dividend
- **What:** A payment from a company to its shareholders, from the company's profits.

### Dividend Allowance
- **What:** The first £500 of dividend income each year is tax-free. Above that, dividends are taxed at special rates (8.75% / 33.75% / 39.35%).

### Dividend Tax Rates
- **What:** Dividends are taxed at lower rates than salary, but the company has already paid corporation tax on the profits before distributing them.
  - Basic rate: 8.75%
  - Higher rate: 33.75%
  - Additional rate: 39.35%

### Dividend Voucher
- **What:** A document a company produces when it pays a dividend, showing the amount, date, and shareholder. Required for tax records.

---

## Child Benefit & HICBC

### Child Benefit
- **What:** A regular government payment to anyone responsible for a child under 16 (or under 20 if in education).
- **Rates (2025/26):** First child: £25.60/week (£1,331/year). Each additional: £16.95/week (£881/year).
- **Why you care:** It gets clawed back from high earners (see HICBC).

### HICBC — High Income Child Benefit Charge
- **What:** A tax charge that claws back Child Benefit when the higher-earning parent has an Adjusted Net Income over £60,000.
- **How it works:** 1% of the Child Benefit is clawed back for every £200 of income over £60,000. At £80,000, 100% is clawed back.
- **Why you care:** Pension contributions reduce ANI and can avoid or reduce HICBC. This is a major planning lever.

---

## Inheritance Tax (IHT)

### Estate
- **What:** Everything a person owns when they die — property, savings, investments, possessions, etc., minus any debts.

### Nil Rate Band (NRB)
- **What:** The first £325,000 of an estate is tax-free. This hasn't changed since 2009.

### Residence Nil Rate Band (RNRB)
- **What:** An extra £175,000 tax-free allowance IF the deceased is passing their home to direct descendants (children, grandchildren).

### Transferable Nil Rate Band
- **What:** If the first spouse to die didn't use all their NRB/RNRB, the unused portion transfers to the surviving spouse. This means a couple can potentially pass on up to £1,000,000 tax-free.

### PET — Potentially Exempt Transfer
- **What:** A gift to another person that becomes fully exempt from IHT if the donor survives 7 years. If they die within 7 years, IHT may apply (with taper relief reducing the rate over time).

### Taper Relief (IHT)
- **What:** If someone dies between 3-7 years after making a PET, the IHT rate on that gift is reduced on a sliding scale. (Not the same as the PA taper — confusing naming!)

### BPR — Business Property Relief
- **What:** 100% IHT relief on qualifying business assets (shares in an unlisted trading company, business assets used in a trade). Effectively removes them from the estate for IHT.

### APR — Agricultural Property Relief
- **What:** 100% IHT relief on qualifying farmland and agricultural property.

### Normal Expenditure Out of Income
- **What:** An IHT exemption for regular gifts made out of income (not capital) that don't affect the donor's standard of living. Potentially unlimited — no cap.
- **Example:** A grandparent who regularly pays grandchildren's school fees from their income.

### Trust
- **What:** A legal arrangement where assets are held by trustees for the benefit of beneficiaries. Used in IHT planning to remove assets from an estate while maintaining some control.

---

## Company / Director Terms

### Limited Company
- **What:** A company that is a separate legal entity from its owners. The directors/shareholders are not personally liable for company debts.
- **Why you care:** Owner-directors have choices about how to extract money (salary, dividends, pension contributions) — each has different tax implications.

### Director
- **What:** A person appointed to manage a limited company. They have legal responsibilities and must file Self Assessment tax returns.

### Shareholder
- **What:** Someone who owns shares in a company. They receive dividends.

### Director's Loan Account (DLA)
- **What:** An account that tracks money flowing between a director and their company. If the director owes the company money, there can be tax charges.

### Corporation Tax (CT)
- **What:** Tax on a company's profits. Currently 25% (for profits over £250,000).

### Salary vs Dividends
- **What:** The key decision for owner-directors — how much to pay themselves as salary (subject to income tax + NI) vs dividends (subject to dividend tax, but no NI). Usually optimal to take salary up to £12,570 and the rest as dividends.

### IR35
- **What:** Tax legislation that determines whether a contractor working through a limited company should be treated as an employee for tax purposes. If caught by IR35, the tax advantages of working through a company are largely removed.

---

## Tax Documents & Forms

### SA100
- **What:** The main Self Assessment tax return form. Covers all income, deductions, and tax calculations.
- **Think of it as:** The UK equivalent of a 1040.

### SA102 — Employment
- **What:** Supplementary page attached to SA100 for reporting employment income.

### SA103S / SA103F — Self-Employment (Short / Full)
- **What:** Supplementary pages for self-employment income. "Short" is for turnover under £85,000, "Full" for above.

### SA105 — UK Property
- **What:** Supplementary page for reporting UK rental property income and expenses.

### SA106 — Foreign Income
- **What:** Supplementary page for reporting income from outside the UK.

### SA108 — Capital Gains
- **What:** Supplementary page for reporting capital gains and losses from selling assets.

### SA109 — Residence and Remittance
- **What:** Supplementary page for people claiming non-UK residence or the remittance basis (relevant for non-domiciled individuals).

### P60
- **What:** A certificate your employer gives you at the end of the tax year, showing your total pay and how much tax/NI was deducted.
- **Think of it as:** The UK equivalent of a W-2.

### P45
- **What:** A certificate you get when you leave a job, showing pay and tax deducted in that employment up to your leaving date. You give it to your next employer.

### P11D
- **What:** A form the employer files to report "benefits in kind" — things like company cars, private medical insurance, gym memberships, etc. These are taxable perks.

### P11D(b)
- **What:** Summary form employers file to report Class 1A NI due on benefits in kind.

### UTR — Unique Taxpayer Reference
- **What:** A 10-digit number HMRC assigns to anyone who registers for Self Assessment. Like an account number for your tax affairs.

### NINO — National Insurance Number
- **What:** Your unique NI identifier (e.g., AB 12 34 56 C). Everyone working in the UK gets one.

### CT600
- **What:** The corporation tax return filed by limited companies.

### R40
- **What:** A form non-taxpayers use to reclaim tax deducted from savings interest.

---

## Planning Strategies (Buzzwords)

### Bed & ISA
- **What:** Sell investments in a taxable account (GIA), crystallise gains within the CGT Annual Exempt Amount (so no tax to pay), then immediately rebuy inside an ISA. Future growth is tax-free.
- **Why it's clever:** You're moving investments from a taxable wrapper to a tax-free wrapper, using your annual CGT exemption.

### Bed & SIPP
- **What:** Same as Bed & ISA, but you contribute the sale proceeds to a pension (SIPP) instead. You get CGT exemption PLUS pension tax relief.

### Bed & Spouse
- **What:** Transfer shares to your spouse (no CGT on spousal transfers), then the spouse sells and uses their own AEA. Doubles the annual exemption.

### Tax Loss Harvesting
- **What:** Selling investments at a loss to offset those losses against gains, reducing your CGT bill. Losses can be carried forward indefinitely.

### PA Restoration
- **What:** Making pension contributions or Gift Aid donations to reduce your ANI below £100,000 (or into the taper zone), thereby restoring some or all of your Personal Allowance.

### Bracket Planning
- **What:** Structuring income to stay within a particular tax band. E.g., ensuring income stays below £50,270 (higher rate threshold) or below £100,000 (PA taper threshold).

### Gift Aid
- **What:** A scheme where charities can reclaim the basic rate tax on donations. If you donate £80 net, the charity gets £100 (claims £20 from HMRC). Higher rate taxpayers can claim back the extra 20% on their tax return.
- **Planning use:** Gift Aid donations reduce ANI (for PA taper) and extend the basic rate band.

### Carry Forward (Pension)
- **What:** Using unused pension Annual Allowance from the previous 3 tax years.

### Year-End Planning
- **What:** A rush of activity before 5 April to use up expiring allowances (ISA, CGT AEA, pension AA, IHT gifts, etc.).

### Income Splitting
- **What:** Transferring income-producing assets to a lower-earning spouse so the income is taxed at their lower rate.

---

## Key Thresholds (The Magic Numbers)

These are the numbers UK Hazel needs to constantly check against:

| Amount | What Happens |
|--------|-------------|
| **£9,100** | Employer NI starts (Secondary Threshold) |
| **£12,570** | Personal Allowance / NI Primary Threshold / Optimal salary for directors |
| **£50,270** | Higher rate (40%) begins / NI drops from 8% to 2% (UEL) |
| **£60,000** | HICBC starts / Pension Annual Allowance |
| **£80,000** | HICBC full clawback (100%) |
| **£90,000** | VAT registration threshold |
| **£100,000** | PA taper begins — 60% tax trap zone starts |
| **£125,140** | PA fully lost / Additional rate (45%) begins |
| **£200,000** | Pension AA taper — threshold income check |
| **£260,000** | Pension AA taper — adjusted income trigger |
| **£325,000** | IHT Nil Rate Band |
| **£500,000** | IHT RNRB starts being tapered away (estate > £2m) |
| **£1,000,000** | Max IHT-free estate for a couple (NRB + RNRB × 2) |

---

## Organisations & Regulators

### HMRC — His Majesty's Revenue and Customs
- Tax authority. Collects all taxes. Runs PAYE, Self Assessment, VAT, etc.

### FCA — Financial Conduct Authority
- Regulates financial services firms, investment platforms, and financial advisers.

### TPR — The Pensions Regulator
- Regulates workplace pensions and auto-enrolment.

### ICAEW — Institute of Chartered Accountants in England and Wales
- Professional body for chartered accountants.

### CIOT — Chartered Institute of Taxation
- Professional body for tax advisers. Awards the CTA qualification.

### ATT — Association of Taxation Technicians
- Professional body for tax technicians (one level below CTA).

---

## People & Roles

### Chartered Accountant (CA / ACA / FCA)
- A qualified accountant. The UK equivalent of a CPA.

### Chartered Tax Adviser (CTA)
- The highest UK tax qualification. A CTA specialises in tax law and planning.

### IFA — Independent Financial Adviser
- A financial adviser who can recommend products from the whole market (not tied to one provider).

### Solicitor
- A lawyer. Relevant for IHT planning, trusts, property transactions, etc.

### Employer
- The company/person who pays your salary and deducts tax/NI via PAYE.

### Self-Employed / Sole Trader
- Someone who runs their own business without a limited company structure. Taxed via Self Assessment.
