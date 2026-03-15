from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

CURRENT_FILE = Path(__file__).resolve()
BACKEND_ROOT = CURRENT_FILE.parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from app.services.monitoring import build_monitoring_dataset
from app.services.utils import DATA_PROCESSED_DIR, ensure_data_directories


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build monitoring preview dataset")
    parser.add_argument(
        "--horizon",
        type=float,
        default=4.0,
        help="Forecast horizon in hours (0 to 48)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    horizon_hours = args.horizon

    if not (0 <= horizon_hours <= 48):
        raise ValueError("horizon must be between 0 and 48 hours")

    ensure_data_directories()

    actuals_path = DATA_PROCESSED_DIR.parent / "raw" / "actuals_jan_2024.csv"
    forecasts_path = DATA_PROCESSED_DIR.parent / "raw" / "forecasts_jan_2024.csv"

    actuals_df = pd.read_csv(actuals_path)
    forecasts_df = pd.read_csv(forecasts_path)

    monitoring_df = build_monitoring_dataset(actuals_df, forecasts_df, horizon_hours=horizon_hours)

    horizon_label = str(horizon_hours).replace(".", "_")
    output_path = DATA_PROCESSED_DIR / f"monitoring_preview_h{horizon_label}.csv"
    monitoring_df.to_csv(output_path, index=False)

    print(f"Saved {len(monitoring_df)} rows to {output_path}")
    print(f"Horizon: {horizon_hours} hours")
    print("\nForecast coverage:")
    print(monitoring_df["forecast_generation"].notna().mean())
    print("\nError summary:")
    print(monitoring_df[["error_mw", "abs_error_mw"]].describe())


if __name__ == "__main__":
    main()