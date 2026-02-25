"""Tests for personal pension contribution analysis."""

from app.tax.personal_pension import analyse_personal_pension
from app.tax.types import IncomeSource, IncomeType


def test_basic_income_tax_saving():
    """£80k salary, propose £10k pension contribution. Should save income tax."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)

    assert r["savings"]["income_tax"] > 0
    assert r["savings"]["total"] > 0
    # Personal pension does NOT save NI
    assert r["current"]["national_insurance"] == r["proposed"]["national_insurance"]
    assert r["proposed"]["pension_contribution"] == 10_000
    assert r["current"]["pension_contribution"] == 0


def test_pa_taper_restoration():
    """£125k salary, contribute £25,140 to bring ANI to £100k. PA fully restored."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 125_140, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=25_140)

    # Current: ANI=125,140 → PA=0. Proposed: ANI=100,000 → PA=12,570.
    assert r["pa_change"]["current"] == 0
    assert r["pa_change"]["proposed"] == 12_570
    assert r["pa_change"]["restored"] == 12_570


def test_hicbc_avoidance():
    """£70k salary + 2 children, contribute £10k to bring ANI to £60k → HICBC eliminated."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 70_000, "Employment")]
    r, _ = analyse_personal_pension(
        sources,
        proposed_contribution=10_000,
        number_of_children=2,
        claims_child_benefit=True,
    )
    assert r["savings"]["hicbc_avoided"] > 0
    assert r["savings"]["total"] > 0


def test_threshold_identification():
    """£120k salary should identify PA taper and higher-rate thresholds."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 120_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=5_000)

    thresholds = r["thresholds"]
    assert len(thresholds) > 0

    # Should have a PA taper threshold
    pa_thresh = [t for t in thresholds if "PA taper" in t["name"]]
    assert len(pa_thresh) == 1
    assert pa_thresh[0]["contribution_needed"] == 20_000  # 120k - 100k
    assert pa_thresh[0]["annual_saving"] > 0


def test_threshold_hicbc_with_children():
    """£75k salary + children should identify HICBC threshold at £60k ANI."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 75_000, "Employment")]
    r, _ = analyse_personal_pension(
        sources,
        proposed_contribution=5_000,
        number_of_children=2,
        claims_child_benefit=True,
    )

    hicbc_thresh = [t for t in r["thresholds"] if "HICBC" in t["name"]]
    assert len(hicbc_thresh) == 1
    assert hicbc_thresh[0]["contribution_needed"] == 15_000  # 75k - 60k


def test_pension_aa_warning():
    """Contribution exceeding AA should generate a warning."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 200_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=65_000)

    assert r["pension_aa_warning"] is not None


def test_existing_contribution_increase():
    """Already contributing £5k, propose increasing to £15k."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(
        sources,
        proposed_contribution=15_000,
        current_contribution=5_000,
    )
    assert r["current"]["pension_contribution"] == 5_000
    assert r["proposed"]["pension_contribution"] == 15_000
    assert r["savings"]["total"] > 0


def test_effective_relief_rate():
    """Effective relief rate should be saving / additional contribution * 100."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)

    expected_rate = r["savings"]["total"] / 10_000 * 100
    assert abs(r["effective_relief_rate"] - expected_rate) < 0.01


def test_multiple_income_sources():
    """Should work with employment + dividends + rental."""
    sources = [
        IncomeSource(IncomeType.EMPLOYMENT, 100_000, "Employment"),
        IncomeSource(IncomeType.DIVIDENDS, 20_000, "Dividends"),
        IncomeSource(IncomeType.RENTAL, 15_000, "Rental"),
    ]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)
    assert r["savings"]["total"] > 0
    # With £135k total income, PA taper threshold should appear
    pa_thresh = [t for t in r["thresholds"] if "PA taper" in t["name"]]
    assert len(pa_thresh) == 1


def test_net_benefit_higher_rate_taxpayer():
    """£80k salary, £10k gross pension. Higher rate taxpayer gets 40% total relief."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)

    nb = r["net_benefit"]
    assert nb["gross_contribution"] == 10_000
    assert nb["net_cost_to_client"] == 8_000          # 10k * 0.8
    assert nb["basic_rate_relief"] == 2_000            # 10k * 0.2
    # Higher rate relief = IT saving from BRB extension
    assert nb["higher_rate_relief"] == r["savings"]["income_tax"]
    assert nb["higher_rate_relief"] > 0
    assert nb["hicbc_avoided"] == 0
    assert nb["total_tax_relief"] == nb["basic_rate_relief"] + nb["higher_rate_relief"]
    assert nb["net_cost_after_relief"] == nb["net_cost_to_client"] - nb["higher_rate_relief"]
    assert nb["net_benefit"] == nb["total_tax_relief"]
    assert 0 < nb["effective_cost_per_pound_in_pension"] < 1

    # Total effective relief should be ~40% for a higher rate taxpayer
    assert r["total_effective_relief_rate"] > 35  # at least 35%


def test_net_benefit_basic_rate_taxpayer():
    """£30k salary, £5k gross pension. Basic rate taxpayer still gets 20% relief."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 30_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=5_000)

    nb = r["net_benefit"]
    assert nb["gross_contribution"] == 5_000
    assert nb["net_cost_to_client"] == 4_000
    assert nb["basic_rate_relief"] == 1_000
    # Basic rate taxpayer: BRB extension doesn't help (already in basic band)
    # So higher_rate_relief should be ~0
    assert nb["higher_rate_relief"] == r["savings"]["income_tax"]
    assert nb["total_tax_relief"] >= 1_000  # At least the basic rate relief
    assert r["total_effective_relief_rate"] >= 20.0


def test_net_benefit_pa_taper_zone():
    """£110k salary, £10k contribution. PA taper gives massive effective relief."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 110_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)

    nb = r["net_benefit"]
    assert nb["gross_contribution"] == 10_000
    assert nb["net_cost_to_client"] == 8_000
    assert nb["basic_rate_relief"] == 2_000
    # In PA taper zone, IT saving includes PA restoration = very high
    assert nb["higher_rate_relief"] > 3_000  # Much more than standard 40% due to PA taper
    assert r["total_effective_relief_rate"] > 50  # Should be well above 50%


def test_net_benefit_with_hicbc():
    """£70k + children, £10k contribution eliminates HICBC. Net benefit includes it."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 70_000, "Employment")]
    r, _ = analyse_personal_pension(
        sources,
        proposed_contribution=10_000,
        number_of_children=2,
        claims_child_benefit=True,
    )

    nb = r["net_benefit"]
    assert nb["hicbc_avoided"] == r["savings"]["hicbc_avoided"]
    assert nb["hicbc_avoided"] > 0
    assert nb["total_tax_relief"] == nb["basic_rate_relief"] + nb["higher_rate_relief"] + nb["hicbc_avoided"]
    assert nb["net_cost_after_relief"] == nb["net_cost_to_client"] - nb["higher_rate_relief"] - nb["hicbc_avoided"]


def test_net_benefit_zero_additional_contribution():
    """Current == proposed, no additional contribution. Net benefit all zeros."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(
        sources,
        proposed_contribution=5_000,
        current_contribution=5_000,
    )

    nb = r["net_benefit"]
    assert nb["gross_contribution"] == 0
    assert nb["net_cost_to_client"] == 0
    assert nb["basic_rate_relief"] == 0
    assert nb["net_benefit"] == 0
    assert r["total_effective_relief_rate"] == 0


def test_net_benefit_existing_contribution_increase():
    """Already contributing £5k, propose £15k. Net benefit based on additional £10k."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(
        sources,
        proposed_contribution=15_000,
        current_contribution=5_000,
    )

    nb = r["net_benefit"]
    # Net benefit is on the ADDITIONAL contribution only
    assert nb["gross_contribution"] == 10_000  # 15k - 5k
    assert nb["net_cost_to_client"] == 8_000   # 10k * 0.8
    assert nb["basic_rate_relief"] == 2_000    # 10k * 0.2


def test_net_benefit_additional_rate_taxpayer():
    """£200k salary, £20k contribution. Additional rate taxpayer gets ~45% total relief."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 200_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=20_000)

    nb = r["net_benefit"]
    assert nb["basic_rate_relief"] == 4_000  # 20k * 0.2
    # Additional rate: BRB extension saves 25% (45% - 20%)
    assert nb["higher_rate_relief"] > 0
    assert r["total_effective_relief_rate"] >= 40  # Should be ~45% but some may be in higher band


def test_net_benefit_aa_warning_still_fires():
    """AA breach warning and net_benefit coexist."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 200_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=65_000)

    assert r["pension_aa_warning"] is not None
    assert "net_benefit" in r
    assert r["net_benefit"]["gross_contribution"] == 65_000


def test_net_benefit_consistency():
    """Net benefit + net cost after relief = gross contribution."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)

    nb = r["net_benefit"]
    # Fundamental identity: net_benefit + net_cost_after_relief = gross
    assert abs(nb["net_benefit"] + nb["net_cost_after_relief"] - nb["gross_contribution"]) < 0.01
    # basic_rate_relief + net_cost_to_client = gross
    assert abs(nb["basic_rate_relief"] + nb["net_cost_to_client"] - nb["gross_contribution"]) < 0.01


def test_total_benefit_higher_rate():
    """£80k salary, £10k contribution. total_benefit aggregates all relief."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)

    tb = r["total_benefit"]
    # Components match net_benefit
    assert tb["basic_rate_relief"] == r["net_benefit"]["basic_rate_relief"]
    assert tb["higher_rate_relief"] == r["net_benefit"]["higher_rate_relief"]
    assert tb["hicbc_avoided"] == r["net_benefit"]["hicbc_avoided"]
    # Total = basic + higher + hicbc
    assert tb["total_annual_benefit"] == tb["basic_rate_relief"] + tb["higher_rate_relief"] + tb["hicbc_avoided"]
    assert tb["total_annual_benefit"] > 0
    # Into pension = gross additional contribution
    assert tb["into_pension"] == 10_000
    # Client out of pocket = net cost after relief
    assert tb["client_out_of_pocket"] == r["net_benefit"]["net_cost_after_relief"]
    # Monthly equivalents
    assert tb["monthly_benefit"] == round(tb["total_annual_benefit"] / 12, 2)
    assert tb["monthly_cost"] == round(tb["client_out_of_pocket"] / 12, 2)
    # PA restoration value (no PA taper at £80k, so should be 0)
    assert tb["pa_restoration_value"] == 0


def test_total_benefit_pa_taper():
    """£110k salary, £10k contribution. PA restoration value shown."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 110_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)

    tb = r["total_benefit"]
    # PA is restored
    assert r["pa_change"]["restored"] > 0
    # PA restoration value = restored * 0.40 (higher rate)
    assert tb["pa_restoration_value"] == round(r["pa_change"]["restored"] * 0.40, 2)
    assert tb["pa_restoration_value"] > 0
    # PA restoration is a SUBSET of higher_rate_relief (annotation, not additive)
    assert tb["pa_restoration_value"] <= tb["higher_rate_relief"]


def test_total_benefit_zero_contribution():
    """No additional contribution → total_benefit all zeros."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(
        sources, proposed_contribution=5_000, current_contribution=5_000
    )

    tb = r["total_benefit"]
    assert tb["total_annual_benefit"] == 0
    assert tb["into_pension"] == 0
    assert tb["client_out_of_pocket"] == 0
    assert tb["monthly_benefit"] == 0
    assert tb["monthly_cost"] == 0
    assert tb["pa_restoration_value"] == 0
