"""
FPIS — Unit Tests: Validasi rumus rasio & margin.
"""

import sys
import os
import pytest
import numpy as np
import pandas as pd
from pathlib import Path

# Tambahkan root ke path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.data_loader import run_data_loader
from src.preprocessing import (
    convert_to_miliar, MILIAR, RATIO_METRICS, PER_SHARE_METRICS,
    COUNT_METRICS,
)


@pytest.fixture(scope="module")
def raw_data():
    """Load raw data."""
    return run_data_loader()


@pytest.fixture(scope="module")
def quarterly_data(raw_data):
    """Quarterly dataframe."""
    return raw_data["quarterly"]


@pytest.fixture(scope="module")
def annual_data(raw_data):
    """Annual dataframe."""
    return raw_data["annual"]


class TestRatioFormulas:
    """Validasi rumus rasio turunan."""

    def _get_pivot(self, df, source="quarterly"):
        """Helper: pivot data."""
        if source == "quarterly":
            return df.pivot_table(
                index=["year", "quarter"],
                columns="metric_id",
                values="value",
                aggfunc="first"
            )
        else:
            return df.pivot_table(
                index="year",
                columns="metric_id",
                values="value",
                aggfunc="first"
            )

    def test_dar_formula(self, quarterly_data):
        """DAR = Total Liabilitas / Total Aset × 100%"""
        pivot = self._get_pivot(quarterly_data)
        if "liabilities" in pivot.columns and "assets" in pivot.columns:
            expected = (pivot["liabilities"] / pivot["assets"]) * 100
            # Verifikasi formula is correct (not testing derived values)
            assert not expected.isna().all(), "DAR should have valid values"
            # DAR typically 30-80% for telco
            valid = expected.dropna()
            assert (valid > 0).all(), "DAR should be positive"
            assert (valid < 200).all(), "DAR should be < 200%"

    def test_der_formula(self, quarterly_data):
        """DER = Total Liabilitas / Total Ekuitas × 100%"""
        pivot = self._get_pivot(quarterly_data)
        if "liabilities" in pivot.columns and "equity" in pivot.columns:
            expected = (pivot["liabilities"] / pivot["equity"]) * 100
            valid = expected.dropna()
            assert (valid > 0).all(), "DER should be positive"

    def test_current_ratio_formula(self, quarterly_data):
        """Current Ratio = Aset Lancar / Liabilitas Lancar × 100%"""
        pivot = self._get_pivot(quarterly_data)
        if "assetsc" in pivot.columns and "currentLiabilities" in pivot.columns:
            expected = (pivot["assetsc"] / pivot["currentLiabilities"]) * 100
            valid = expected.dropna()
            assert (valid > 0).all(), "CR should be positive"

    def test_quick_ratio_formula(self, quarterly_data):
        """Quick Ratio = (Aset Lancar - Persediaan) / Liabilitas Lancar"""
        pivot = self._get_pivot(quarterly_data)
        required = ["assetsc", "inventory", "currentLiabilities"]
        if all(c in pivot.columns for c in required):
            expected = (pivot["assetsc"] - pivot["inventory"]) / pivot["currentLiabilities"]
            valid = expected.dropna()
            assert (valid > 0).all(), "QR should be positive"

    def test_roa_formula(self, quarterly_data):
        """ROA = Laba Bersih / Total Aset × 100%"""
        pivot = self._get_pivot(quarterly_data)
        if "netinc" in pivot.columns and "assets" in pivot.columns:
            expected = (pivot["netinc"] / pivot["assets"]) * 100
            valid = expected.dropna()
            assert not valid.empty, "ROA should have valid values"

    def test_roe_formula(self, quarterly_data):
        """ROE = Laba Bersih / Total Ekuitas × 100%"""
        pivot = self._get_pivot(quarterly_data)
        if "netinc" in pivot.columns and "equity" in pivot.columns:
            expected = (pivot["netinc"] / pivot["equity"]) * 100
            valid = expected.dropna()
            assert not valid.empty, "ROE should have valid values"

    def test_firm_size_formula(self, quarterly_data):
        """Firm Size = Ln(Total Aset)"""
        pivot = self._get_pivot(quarterly_data)
        if "assets" in pivot.columns:
            valid_assets = pivot["assets"].dropna()
            expected = np.log(valid_assets[valid_assets > 0])
            assert not expected.empty, "Firm Size should have valid values"
            # Ln of trillions should be ~30+ (in Rupiah penuh)
            assert (expected > 20).all(), "Firm Size (ln assets) should be > 20"


class TestMarginValidation:
    """Validasi margin pipeline vs data asli (toleransi ±0.2pp)."""

    TOLERANCE = 0.002  # 0.2 poin persen

    def _get_pivot(self, df):
        return df.pivot_table(
            index=["year", "quarter"],
            columns="metric_id",
            values="value",
            aggfunc="first"
        )

    def test_gross_margin(self, quarterly_data):
        """Gross Margin = Gross Profit / Revenue."""
        pivot = self._get_pivot(quarterly_data)
        if all(c in pivot.columns for c in ["grossMargin", "gp", "revenue"]):
            reported = pivot["grossMargin"].dropna()
            computed = (pivot["gp"] / pivot["revenue"]).loc[reported.index].dropna()

            common_idx = reported.index.intersection(computed.index)
            if len(common_idx) > 0:
                diff = (reported.loc[common_idx] - computed.loc[common_idx]).abs()
                assert diff.max() < self.TOLERANCE, \
                    f"Gross margin diff {diff.max():.4f} exceeds tolerance {self.TOLERANCE}"

    def test_operating_margin(self, quarterly_data):
        """Operating Margin = Operating Income / Revenue."""
        pivot = self._get_pivot(quarterly_data)
        if all(c in pivot.columns for c in ["operatingMargin", "opinc", "revenue"]):
            reported = pivot["operatingMargin"].dropna()
            computed = (pivot["opinc"] / pivot["revenue"]).loc[reported.index].dropna()

            common_idx = reported.index.intersection(computed.index)
            if len(common_idx) > 0:
                diff = (reported.loc[common_idx] - computed.loc[common_idx]).abs()
                assert diff.max() < self.TOLERANCE, \
                    f"Operating margin diff {diff.max():.4f} exceeds tolerance {self.TOLERANCE}"

    def test_profit_margin(self, quarterly_data):
        """Profit Margin = Net Income / Revenue."""
        pivot = self._get_pivot(quarterly_data)
        if all(c in pivot.columns for c in ["profitMargin", "netinc", "revenue"]):
            reported = pivot["profitMargin"].dropna()
            computed = (pivot["netinc"] / pivot["revenue"]).loc[reported.index].dropna()

            common_idx = reported.index.intersection(computed.index)
            if len(common_idx) > 0:
                diff = (reported.loc[common_idx] - computed.loc[common_idx]).abs()
                assert diff.max() < self.TOLERANCE, \
                    f"Profit margin diff {diff.max():.4f} exceeds tolerance {self.TOLERANCE}"


class TestUnitConversion:
    """Validasi konversi unit."""

    def test_miliar_conversion_skips_ratios(self):
        """Rasio tidak dikonversi ke miliar."""
        df = pd.DataFrame({
            "metric_id": ["revenue", "grossMargin", "epsBasic", "sharesBasic"],
            "value": [1e12, 0.45, 150.0, 99e9],
        })
        result = convert_to_miliar(df)

        # Revenue dikonversi
        assert result.loc[result["metric_id"] == "revenue", "value"].iloc[0] == pytest.approx(1000.0)
        # Margin TIDAK dikonversi
        assert result.loc[result["metric_id"] == "grossMargin", "value"].iloc[0] == pytest.approx(0.45)
        # EPS TIDAK dikonversi
        assert result.loc[result["metric_id"] == "epsBasic", "value"].iloc[0] == pytest.approx(150.0)
        # Shares TIDAK dikonversi
        assert result.loc[result["metric_id"] == "sharesBasic", "value"].iloc[0] == pytest.approx(99e9)


class TestHardConstraints:
    """Validasi hard constraints — TIDAK ADA referensi harga saham/trading."""

    def test_no_stock_price_metrics(self, quarterly_data):
        """Pastikan tidak ada metrik prediksi harga saham."""
        forbidden = ["stockPrice", "sharePrice", "marketCap", "PER", "PBV"]
        for metric in forbidden:
            assert metric not in quarterly_data["metric_id"].values, \
                f"Forbidden metric found: {metric}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
