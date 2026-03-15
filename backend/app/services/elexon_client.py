from __future__ import annotations

import httpx
import pandas as pd

from app.services.constants import REQUEST_FORMAT


class ElexonClient:
    def __init__(self, timeout: float = 30.0) -> None:
        self.timeout = timeout

    def fetch_dataset(self, endpoint: str, params: dict) -> pd.DataFrame:
        request_params = {**params, "format": REQUEST_FORMAT}

        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(endpoint, params=request_params)
            response.raise_for_status()
            payload = response.json()

        data = payload.get("data", [])
        if not isinstance(data, list):
            raise ValueError("Unexpected API response format: 'data' is not a list")

        return pd.DataFrame(data)