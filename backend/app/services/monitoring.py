from __future__ import annotations

import pandas as pd


def build_monitoring_dataset(
    actuals_df: pd.DataFrame,
    forecasts_df: pd.DataFrame,
    horizon_hours: float,
) -> pd.DataFrame:
    actuals = actuals_df.copy()
    forecasts = forecasts_df.copy()

    actuals["startTime"] = pd.to_datetime(actuals["startTime"], utc=True, errors="coerce")
    forecasts["startTime"] = pd.to_datetime(forecasts["startTime"], utc=True, errors="coerce")
    forecasts["publishTime"] = pd.to_datetime(forecasts["publishTime"], utc=True, errors="coerce")

    actuals = actuals.dropna(subset=["startTime", "generation"]).copy()
    forecasts = forecasts.dropna(subset=["startTime", "publishTime", "generation"]).copy()

    actuals = actuals.rename(columns={"generation": "actual_generation"})
    forecasts = forecasts.rename(columns={"generation": "forecast_generation"})

    actuals["cutoff_time"] = actuals["startTime"] - pd.to_timedelta(horizon_hours, unit="h")

    merged = actuals.merge(
        forecasts,
        on="startTime",
        how="left",
    )

    eligible = merged[merged["publishTime"] <= merged["cutoff_time"]].copy()

    if eligible.empty:
        return actuals.loc[:, ["startTime", "actual_generation"]].assign(
            publishTime=pd.NaT,
            forecast_generation=pd.NA,
            effective_horizon_hours=pd.NA,
            error_mw=pd.NA,
            abs_error_mw=pd.NA,
        )

    eligible["effective_horizon_hours"] = (
        (eligible["startTime"] - eligible["publishTime"]).dt.total_seconds() / 3600.0
    )

    eligible = eligible.sort_values(["startTime", "publishTime"])
    latest = eligible.groupby("startTime", as_index=False).tail(1).copy()

    result = actuals.merge(
        latest.loc[:, ["startTime", "publishTime", "forecast_generation", "effective_horizon_hours"]],
        on="startTime",
        how="left",
    )

    result["error_mw"] = result["forecast_generation"] - result["actual_generation"]
    result["abs_error_mw"] = result["error_mw"].abs()

    return result.sort_values("startTime").reset_index(drop=True)