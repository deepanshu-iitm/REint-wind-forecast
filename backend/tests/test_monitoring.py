from __future__ import annotations

import pandas as pd

from app.services.monitoring import build_monitoring_dataset


def test_build_monitoring_dataset_selects_latest_eligible_forecast() -> None:
    actuals_df = pd.DataFrame(
        [
            {
                "startTime": "2024-01-01T18:00:00Z",
                "generation": 1000,
            }
        ]
    )

    forecasts_df = pd.DataFrame(
        [
            {
                "startTime": "2024-01-01T18:00:00Z",
                "publishTime": "2024-01-01T12:00:00Z",
                "generation": 900,
            },
            {
                "startTime": "2024-01-01T18:00:00Z",
                "publishTime": "2024-01-01T13:30:00Z",
                "generation": 950,
            },
            {
                "startTime": "2024-01-01T18:00:00Z",
                "publishTime": "2024-01-01T14:30:00Z",
                "generation": 990,
            },
        ]
    )

    result = build_monitoring_dataset(actuals_df, forecasts_df, horizon_hours=4)

    row = result.iloc[0]

    assert row["actual_generation"] == 1000
    assert row["forecast_generation"] == 950
    assert str(row["publishTime"]) == "2024-01-01 13:30:00+00:00"
    assert row["error_mw"] == -50
    assert row["abs_error_mw"] == 50


def test_build_monitoring_dataset_returns_null_when_no_eligible_forecast() -> None:
    actuals_df = pd.DataFrame(
        [
            {
                "startTime": "2024-01-01T18:00:00Z",
                "generation": 1000,
            }
        ]
    )

    forecasts_df = pd.DataFrame(
        [
            {
                "startTime": "2024-01-01T18:00:00Z",
                "publishTime": "2024-01-01T15:00:00Z",
                "generation": 990,
            }
        ]
    )

    result = build_monitoring_dataset(actuals_df, forecasts_df, horizon_hours=4)

    row = result.iloc[0]

    assert row["actual_generation"] == 1000
    assert pd.isna(row["forecast_generation"])
    assert pd.isna(row["publishTime"])
    assert pd.isna(row["error_mw"])
    assert pd.isna(row["abs_error_mw"])