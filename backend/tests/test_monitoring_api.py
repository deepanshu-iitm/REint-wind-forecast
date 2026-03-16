from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_timeseries_returns_200_for_valid_request() -> None:
    response = client.get(
        "/monitoring/timeseries",
        params={
            "start": "2024-01-05T00:00:00Z",
            "end": "2024-01-06T23:30:00Z",
            "horizon": 4,
        },
    )

    assert response.status_code == 200

    payload = response.json()
    assert "items" in payload
    assert payload["horizon"] == 4
    assert payload["count"] >= 0


def test_timeseries_rejects_start_after_end() -> None:
    response = client.get(
        "/monitoring/timeseries",
        params={
            "start": "2024-01-07T00:00:00Z",
            "end": "2024-01-06T23:30:00Z",
            "horizon": 4,
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "'start' must be earlier than 'end'."


def test_timeseries_rejects_invalid_datetime() -> None:
    response = client.get(
        "/monitoring/timeseries",
        params={
            "start": "abc",
            "end": "2024-01-06T23:30:00Z",
            "horizon": 4,
        },
    )

    assert response.status_code == 400
    assert "Invalid datetime format" in response.json()["detail"]


def test_timeseries_rejects_horizon_above_limit() -> None:
    response = client.get(
        "/monitoring/timeseries",
        params={
            "start": "2024-01-05T00:00:00Z",
            "end": "2024-01-06T23:30:00Z",
            "horizon": 99,
        },
    )

    assert response.status_code == 422