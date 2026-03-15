from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

CURRENT_FILE = Path(__file__).resolve()
BACKEND_ROOT = CURRENT_FILE.parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from app.services.constants import (
    FUELHH_STREAM_ENDPOINT,
    JAN_2024_SETTLEMENT_DATE_FROM,
    JAN_2024_SETTLEMENT_DATE_TO,
    TARGET_FUEL_TYPE,
)
from app.services.elexon_client import ElexonClient
from app.services.utils import DATA_RAW_DIR, ensure_data_directories, to_utc_datetime


def main() -> None:
    ensure_data_directories()

    client = ElexonClient()
    params = {
        "settlementDateFrom": JAN_2024_SETTLEMENT_DATE_FROM,
        "settlementDateTo": JAN_2024_SETTLEMENT_DATE_TO,
        "fuelType": [TARGET_FUEL_TYPE],
        "format": "json",
    }

    df = client.fetch_dataset(FUELHH_STREAM_ENDPOINT, params=params)

    if df.empty:
        raise ValueError("No actual generation data returned from API.")

    expected_columns = {"startTime", "generation", "fuelType", "settlementDate"}
    missing = expected_columns - set(df.columns)
    if missing:
        raise ValueError(f"Missing expected columns in actuals response: {missing}")

    df = df.loc[:, ["startTime", "settlementDate", "fuelType", "generation"]].copy()
    df["startTime"] = to_utc_datetime(df["startTime"])
    df["generation"] = pd.to_numeric(df["generation"], errors="coerce")

    df = df[df["fuelType"] == TARGET_FUEL_TYPE]
    df = df.dropna(subset=["startTime", "generation"])
    df = df.sort_values("startTime").drop_duplicates(subset=["startTime"]).reset_index(drop=True)

    output_path = DATA_RAW_DIR / "actuals_jan_2024.csv"
    df.to_csv(output_path, index=False)

    print(f"Saved {len(df)} actual rows to {output_path}")
    print(df.head())
    print(df.tail())


if __name__ == "__main__":
    main()