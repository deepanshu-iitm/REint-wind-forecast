from __future__ import annotations

from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.services.monitoring import build_monitoring_dataset

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

DATA_ROOT = Path(__file__).resolve().parents[3] / "data"
ACTUALS_PATH = DATA_ROOT / "raw" / "actuals_jan_2024.csv"
FORECASTS_PATH = DATA_ROOT / "raw" / "forecasts_jan_2024.csv"


def _load_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise HTTPException(status_code=500, detail=f"Required data file not found: {path.name}")
    return pd.read_csv(path)


@router.get("/timeseries")
def get_monitoring_timeseries(
    start: str = Query(..., description="Start datetime in ISO-8601 format"),
    end: str = Query(..., description="End datetime in ISO-8601 format"),
    horizon: float = Query(..., ge=0, le=48, description="Forecast horizon in hours"),
) -> dict:
    try:
        start_ts = pd.to_datetime(start, utc=True)
        end_ts = pd.to_datetime(end, utc=True)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid datetime format. Use ISO-8601, for example 2024-01-05T00:00:00Z.",
        ) from exc

    if pd.isna(start_ts) or pd.isna(end_ts):
        raise HTTPException(
            status_code=400,
            detail="Invalid datetime value provided.",
        )

    if start_ts >= end_ts:
        raise HTTPException(
            status_code=400,
            detail="'start' must be earlier than 'end'.",
        )

    actuals_df = _load_csv(ACTUALS_PATH)
    forecasts_df = _load_csv(FORECASTS_PATH)

    monitoring_df = build_monitoring_dataset(
        actuals_df=actuals_df,
        forecasts_df=forecasts_df,
        horizon_hours=horizon,
    )

    monitoring_df["startTime"] = pd.to_datetime(monitoring_df["startTime"], utc=True)

    filtered_df = monitoring_df[
        (monitoring_df["startTime"] >= start_ts) & (monitoring_df["startTime"] <= end_ts)
    ].copy()

    filtered_df = filtered_df.sort_values("startTime")

    items = []
    for _, row in filtered_df.iterrows():
        items.append(
            {
                "startTime": row["startTime"].isoformat() if pd.notna(row["startTime"]) else None,
                "actualGeneration": (
                    int(row["actual_generation"]) if pd.notna(row["actual_generation"]) else None
                ),
                "forecastGeneration": (
                    int(row["forecast_generation"]) if pd.notna(row["forecast_generation"]) else None
                ),
                "publishTime": (
                    pd.to_datetime(row["publishTime"], utc=True).isoformat()
                    if pd.notna(row["publishTime"])
                    else None
                ),
                "effectiveHorizonHours": (
                    float(row["effective_horizon_hours"])
                    if pd.notna(row["effective_horizon_hours"])
                    else None
                ),
                "errorMW": int(row["error_mw"]) if pd.notna(row["error_mw"]) else None,
                "absErrorMW": int(row["abs_error_mw"]) if pd.notna(row["abs_error_mw"]) else None,
            }
        )

    return {
        "start": start_ts.isoformat(),
        "end": end_ts.isoformat(),
        "horizon": horizon,
        "count": len(items),
        "items": items,
    }