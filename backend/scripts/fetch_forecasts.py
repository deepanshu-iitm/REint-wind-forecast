from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

CURRENT_FILE = Path(__file__).resolve()
BACKEND_ROOT = CURRENT_FILE.parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from app.services.constants import (
    JAN_2024_PUBLISH_FROM,
    JAN_2024_PUBLISH_TO,
    WINDFOR_STREAM_ENDPOINT,
)
from app.services.elexon_client import ElexonClient
from app.services.utils import DATA_RAW_DIR, ensure_data_directories, to_utc_datetime


def main() -> None:
    ensure_data_directories()

    client = ElexonClient()
    params = {
        "publishDateTimeFrom": JAN_2024_PUBLISH_FROM,
        "publishDateTimeTo": JAN_2024_PUBLISH_TO,
        "format": "json",
    }

    df = client.fetch_dataset(WINDFOR_STREAM_ENDPOINT, params=params)

    if df.empty:
        raise ValueError("No forecast data returned from API.")

    expected_columns = {"publishTime", "startTime", "generation"}
    missing = expected_columns - set(df.columns)
    if missing:
        raise ValueError(f"Missing expected columns in forecast response: {missing}")

    df = df.loc[:, ["publishTime", "startTime", "generation"]].copy()
    df["publishTime"] = to_utc_datetime(df["publishTime"])
    df["startTime"] = to_utc_datetime(df["startTime"])
    df["generation"] = pd.to_numeric(df["generation"], errors="coerce")

    df = df.dropna(subset=["publishTime", "startTime", "generation"]).copy()

    df["horizon_hours"] = (
        (df["startTime"] - df["publishTime"]).dt.total_seconds() / 3600.0
    )

    df = df[(df["horizon_hours"] >= 0) & (df["horizon_hours"] <= 48)].copy()
    df = df.sort_values(["startTime", "publishTime"]).reset_index(drop=True)

    output_path = DATA_RAW_DIR / "forecasts_jan_2024.csv"
    df.to_csv(output_path, index=False)

    print(f"Saved {len(df)} forecast rows to {output_path}")
    print(df.head())
    print(df.tail())
    print("\nHorizon summary:")
    print(df["horizon_hours"].describe())


if __name__ == "__main__":
    main()