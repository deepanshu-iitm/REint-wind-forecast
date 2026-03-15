from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
import pandas as pd

from app.services.monitoring import build_monitoring_dataset
from app.services.utils import DATA_RAW_DIR

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.get("/timeseries")
def get_monitoring_timeseries(
    start: str = Query(..., description="Start timestamp in ISO format"),
    end: str = Query(..., description="End timestamp in ISO format"),
    horizon: float = Query(..., ge=0, le=48, description="Forecast horizon in hours"),
) -> dict:
    try:
        start_dt = pd.to_datetime(start, utc=True)
        end_dt = pd.to_datetime(end, utc=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid datetime format: {exc}")

    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="start must be before or equal to end")

    actuals_path = DATA_RAW_DIR / "actuals_jan_2024.csv"
    forecasts_path = DATA_RAW_DIR / "forecasts_jan_2024.csv"

    if not actuals_path.exists() or not forecasts_path.exists():
        raise HTTPException(status_code=500, detail="Required raw data files are missing")

    actuals_df = pd.read_csv(actuals_path)
    forecasts_df = pd.read_csv(forecasts_path)

    monitoring_df = build_monitoring_dataset(
        actuals_df=actuals_df,
        forecasts_df=forecasts_df,
        horizon_hours=horizon,
    )

    monitoring_df["startTime"] = pd.to_datetime(monitoring_df["startTime"], utc=True, errors="coerce")
    filtered = monitoring_df[
        (monitoring_df["startTime"] >= start_dt) & (monitoring_df["startTime"] <= end_dt)
    ].copy()

    filtered = filtered.sort_values("startTime")

    records = []
    for _, row in filtered.iterrows():
        records.append(
            {
                "startTime": row["startTime"].isoformat() if pd.notna(row["startTime"]) else None,
                "actualGeneration": None if pd.isna(row["actual_generation"]) else float(row["actual_generation"]),
                "forecastGeneration": None if pd.isna(row["forecast_generation"]) else float(row["forecast_generation"]),
                "publishTime": None if pd.isna(row["publishTime"]) else pd.to_datetime(row["publishTime"], utc=True).isoformat(),
                "effectiveHorizonHours": None if pd.isna(row["effective_horizon_hours"]) else float(row["effective_horizon_hours"]),
                "errorMW": None if pd.isna(row["error_mw"]) else float(row["error_mw"]),
                "absErrorMW": None if pd.isna(row["abs_error_mw"]) else float(row["abs_error_mw"]),
            }
        )

    return {
        "start": start_dt.isoformat(),
        "end": end_dt.isoformat(),
        "horizon": horizon,
        "count": len(records),
        "items": records,
    }