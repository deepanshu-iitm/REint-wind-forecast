from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

CURRENT_FILE = Path(__file__).resolve()
BACKEND_ROOT = CURRENT_FILE.parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from app.services.monitoring import build_monitoring_dataset


def main() -> None:
    actuals_path = BACKEND_ROOT.parent / "data" / "raw" / "actuals_jan_2024.csv"
    forecasts_path = BACKEND_ROOT.parent / "data" / "raw" / "forecasts_jan_2024.csv"

    actuals_df = pd.read_csv(actuals_path)
    forecasts_df = pd.read_csv(forecasts_path)

    horizon = 4.0
    monitoring_df = build_monitoring_dataset(actuals_df, forecasts_df, horizon_hours=horizon)

    monitoring_df["startTime"] = pd.to_datetime(monitoring_df["startTime"], utc=True)
    forecasts_df["startTime"] = pd.to_datetime(forecasts_df["startTime"], utc=True)
    forecasts_df["publishTime"] = pd.to_datetime(forecasts_df["publishTime"], utc=True)

    sample = monitoring_df[monitoring_df["forecast_generation"].notna()].copy().head(10)

    print(f"Validating {len(sample)} sample rows for horizon={horizon}h\n")

    for _, row in sample.iterrows():
        target_time = row["startTime"]
        chosen_publish_time = pd.to_datetime(row["publishTime"], utc=True)
        cutoff_time = target_time - pd.to_timedelta(horizon, unit="h")

        candidates = forecasts_df[
            (forecasts_df["startTime"] == target_time)
            & (forecasts_df["publishTime"] <= cutoff_time)
        ].copy()

        candidates = candidates.sort_values("publishTime")

        expected_publish_time = candidates["publishTime"].max() if not candidates.empty else pd.NaT

        print("=" * 80)
        print(f"Target time:          {target_time}")
        print(f"Cutoff time:          {cutoff_time}")
        print(f"Chosen publish time:  {chosen_publish_time}")
        print(f"Expected latest valid:{expected_publish_time}")
        print(f"Match:                {chosen_publish_time == expected_publish_time}")

        if not candidates.empty:
            print("\nLast 5 eligible candidate publish times:")
            print(candidates[["publishTime", "generation"]].tail(5).to_string(index=False))
        else:
            print("\nNo eligible candidates found.")

    print("\nValidation complete.")


if __name__ == "__main__":
    main()