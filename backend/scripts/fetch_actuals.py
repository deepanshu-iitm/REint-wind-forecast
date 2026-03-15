from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

CURRENT_FILE = Path(__file__).resolve()
BACKEND_ROOT = CURRENT_FILE.parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from app.services.constants import (
    FUELHH_ENDPOINT,
    JAN_2024_END,
    JAN_2024_START,
    TARGET_FUEL_TYPE,
)
from app.services.elexon_client import ElexonClient
from app.services.utils import DATA_RAW_DIR, ensure_data_directories, to_utc_datetime


def main() -> None:
    ensure_data_directories()

    client = ElexonClient()
    params = {
        "from": JAN_2024_START,
        "to": JAN_2024_END,
        "fuelType": TARGET_FUEL_TYPE,
    }

    df = client.fetch_dataset(FUELHH_ENDPOINT, params=params)

    if df.empty:
        raise ValueError("No actual generation data returned from API.")

    expected_columns = {"startTime", "generation"}
    missing = expected_columns - set(df.columns)
    if missing:
        raise ValueError(f"Missing expected columns in actuals response: {missing}")

    df = df.loc[:, ["startTime", "generation"]].copy()
    df["startTime"] = to_utc_datetime(df["startTime"])
    df["generation"] = pd.to_numeric(df["generation"], errors="coerce")

    df = df.dropna(subset=["startTime", "generation"])
    df = df.sort_values("startTime").drop_duplicates(subset=["startTime"]).reset_index(drop=True)

    output_path = DATA_RAW_DIR / "actuals_jan_2024.csv"
    df.to_csv(output_path, index=False)

    print(f"Saved {len(df)} actual rows to {output_path}")


if __name__ == "__main__":
    main()