from __future__ import annotations

import httpx
import pandas as pd


class ElexonClient:
    def __init__(self, timeout: float = 30.0) -> None:
        self.timeout = timeout

    def fetch_json(self, endpoint: str, params: dict):
        with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
            response = client.get(endpoint, params=params)
            print(f"Request URL: {response.url}")
            response.raise_for_status()
            return response.json()

    def fetch_dataset(self, endpoint: str, params: dict) -> pd.DataFrame:
        payload = self.fetch_json(endpoint, params)

        if isinstance(payload, list):
            data = payload
        elif isinstance(payload, dict):
            data = payload.get("data", [])
        else:
            raise ValueError(f"Unexpected API response type: {type(payload).__name__}")

        if not isinstance(data, list):
            raise ValueError("Unexpected API response format: extracted data is not a list")

        return pd.DataFrame(data)