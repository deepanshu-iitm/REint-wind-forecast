# REint Wind Forecast Monitoring & Analysis

Forecast monitoring app and analysis for **UK national wind power generation forecasts** for **January 2024**.

This submission contains:

- a **forecast monitoring web app**
- a **backend API** for serving monitoring time series
- **data-fetching and validation scripts**
- a **Jupyter notebook** analyzing forecast error characteristics
- a recommendation for how much wind power can be **reliably expected** to be available based on historical actual generation

## Problem statement

The task has two parts:

1. Build a forecast monitoring app that compares:
   - **actual UK wind generation**
   - **forecasted UK wind generation**

   For any selected time range, the app shows the **latest forecast published at least `h` hours before each target time**, where `h` is configurable through a slider.

2. Analyze the forecast dataset to understand:
   - forecast error characteristics
   - how error changes with forecast horizon
   - how error varies over time
   - how much wind generation can be **reliably expected** to be available to meet electricity demand

## Data sources

The application uses the Elexon BMRS datasets:

- **Actual generation**: `FUELHH/stream`
  - filtered to `fuelType = WIND`
- **Forecast generation**: `WINDFOR/stream`

Both datasets are restricted to **January 2024** for this submission.

## Main findings

### Monitoring-app perspective

Using the app rule of selecting the latest forecast published at least **4 hours** before each target time:

- Forecast coverage is about **48.6%**
- Coverage is limited because:
  - actuals are mostly **30-minute**
  - forecast target times are mostly **hourly**
- The selected forecast is often older than the requested 4 hours in practice
  - mean effective horizon: about **11.2 hours**
  - median effective horizon: **9.5 hours**
- Forecasts show a strong **positive bias**
  - mean error: about **+1227 MW**
  - overprediction share: about **70.5%**
- Forecast errors are material
  - mean absolute error: about **1838 MW**
  - p95 absolute error: about **4613 MW**

### Raw forecast perspective

Using all raw forecast rows directly:

- Forecast error increases gradually with horizon
- Mean absolute error rises from roughly:
  - **1.9 GW** for short horizons
  - to **2.3 GW** for longer horizons
- Forecasts remain positively biased across most horizons
- Tail errors are large, with p95 errors often around **4.7–5.0 GW**

### Reliable wind generation recommendation

Based on January 2024 actual UK wind generation:

- Mean generation: about **9849 MW**
- Median generation: about **9864 MW**
- Generation available at least **90% of the time**: about **5088 MW**
- Generation available at least **75% of the time**: about **6733 MW**

**Recommendation:**  
A prudent conservative estimate of reliably available wind generation is **about 5.1 GW**.

## Tech stack

### Backend
- Python
- FastAPI
- pandas
- pytest
- uvicorn

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts

### Analysis
- Jupyter Notebook
- pandas
- matplotlib / notebook analysis tools

### Repository Structure

- **backend/**
  - **app/main.py**: FastAPI application entrypoint, mounts core routes and `/monitoring` API and configures CORS for the frontend (`http://localhost:3000`).
  - **app/api/routes.py**: Root (`/`) and `/health` endpoints (basic status and metadata).
  - **app/api/monitoring.py**: `/monitoring/timeseries` endpoint; loads CSVs from `data/raw`, builds monitoring dataset and returns cleaned time series.
  - **app/services/**: Business logic and utilities (monitoring dataset builder, Elexon client, constants, helpers).
  - **app/config.py**: Settings (env, port, app name/version) loaded from environment via `python-dotenv`.
  - **scripts/**: CLI helpers to fetch/build/validate monitoring datasets.
  - **tests/**: Pytest suite for APIs and monitoring logic.
  - **requirements.txt**: Backend dependencies (FastAPI, uvicorn, pandas, numpy, etc.).
  - **venv/** (optional): Local Python virtual environment (not required if you use your own env).

- **frontend/**
  - **src/app/page.tsx**: Main client page that:
    - Builds a query to `${NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}/monitoring/timeseries`.
    - Lets you choose `start`, `end` and `horizon` and fetches monitoring data.
    - Renders summary cards (coverage, mean/absolute/max error) and a Recharts line chart plus sample table.
  - **src/app/layout.tsx**: Root layout for the dashboard.
  - **next.config.ts, tsconfig.json, eslint.config.mjs, postcss.config.mjs**: Standard Next.js/TypeScript/Tailwind tooling.
  - **package.json / package-lock.json**: Frontend dependencies and scripts.
  - **.env.local**: Frontend env vars (e.g. `NEXT_PUBLIC_API_BASE_URL`).

- **notebooks/**
  - **wind_forecast_analysis.ipynb**: Jupyter notebook for exploring and validating the wind forecast data and monitoring approach.

- **data/**
  - **raw/actuals_jan_2024.csv**, **raw/forecasts_jan_2024.csv**: CSV inputs used by the monitoring API 

---

### Running the Application Locally

You need **Python 3.10+** and **Node 18+** 

#### 1. Backend API (FastAPI)

Clone the repository

```bash
git clonehttps://github.com/deepanshu-iitm/REint-wind-forecast.git
cd REint-wind-forecast
```

From the repository root:

```bash
cd backend
python -m venv .venv  
source .venv\Scripts\activate
pip install -r requirements.txt
```

Then start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://127.0.0.1:8000`:

- Root metadata: `GET /`
- Health check: `GET /health`
- Monitoring endpoint: `GET /monitoring/timeseries?start=...&end=...&horizon=...`

#### 2. Frontend Dashboard 

In a separate terminal, from the repository root:

```bash
cd frontend
npm install
```

Configure the API base URL (defaults to `http://127.0.0.1:8000`):

```bash
echo NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 > .env.local
```

Run the dev server:

```bash
npm run dev
```

The dashboard is available at `http://localhost:3000`. It will query the backend API, display time series plots and summary metrics, and update automatically when you change the filters.

### Fetching Data
From backend/:

Fetch actual generation data

```bash
python scripts/fetch_actuals.py
```

Fetch forecast data

```bash
python scripts/fetch_forecasts.py
```
This saves raw data into:

**data/raw/**

---

### Tests and Notebooks

- **Backend tests**:

  ```bash
  cd backend
  pytest
  ```

- **Exploratory notebook**:

  ```bash
  cd notebooks
  jupyter notebook wind_forecast_analysis.ipynb
  ```

---

### Deployment

- **Live app URL**: https://r-eint-wind-forecast.vercel.app/


