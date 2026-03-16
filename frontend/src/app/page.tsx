"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonitoringItem = {
  startTime: string | null;
  actualGeneration: number | null;
  forecastGeneration: number | null;
  publishTime: string | null;
  effectiveHorizonHours: number | null;
  errorMW: number | null;
  absErrorMW: number | null;
};

type MonitoringResponse = {
  start: string;
  end: string;
  horizon: number;
  count: number;
  items: MonitoringItem[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatUtcDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">
        {value}
      </p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default function Home() {
  const [start, setStart] = useState("2024-01-05T00:00");
  const [end, setEnd] = useState("2024-01-06T23:30");
  const [horizon, setHorizon] = useState(4);
  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = useMemo(() => {
    const startIso = `${start}:00Z`;
    const endIso = `${end}:00Z`;
    return `${API_BASE_URL}/monitoring/timeseries?start=${encodeURIComponent(
      startIso
    )}&end=${encodeURIComponent(endIso)}&horizon=${horizon}`;
  }, [start, end, horizon]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
          const body = await response.json();
          if (body?.detail) {
            message = String(body.detail);
          }
        } catch {
          //
        }
        throw new Error(message);
      }

      const json: MonitoringResponse = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [apiUrl]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.items.map((item) => ({
      ...item,
      label: formatDateLabel(item.startTime),
    }));
  }, [data]);

  const summary = useMemo(() => {
    if (!data) {
      return {
        coveragePct: 0,
        meanAbsError: null as number | null,
        meanError: null as number | null,
        maxAbsError: null as number | null,
        validForecastCount: 0,
      };
    }

    const validForecasts = data.items.filter(
      (item) => item.forecastGeneration !== null
    );
    const validErrors = data.items
      .map((item) => item.errorMW)
      .filter((value): value is number => value !== null);
    const validAbsErrors = data.items
      .map((item) => item.absErrorMW)
      .filter((value): value is number => value !== null);

    const coveragePct =
      data.items.length > 0 ? (validForecasts.length / data.items.length) * 100 : 0;

    const meanError =
      validErrors.length > 0
        ? validErrors.reduce((sum, value) => sum + value, 0) / validErrors.length
        : null;

    const meanAbsError =
      validAbsErrors.length > 0
        ? validAbsErrors.reduce((sum, value) => sum + value, 0) / validAbsErrors.length
        : null;

    const maxAbsError =
      validAbsErrors.length > 0 ? Math.max(...validAbsErrors) : null;

    return {
      coveragePct,
      meanAbsError,
      meanError,
      maxAbsError,
      validForecastCount: validForecasts.length,
    };
  }, [data]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                Forecast Monitoring
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                UK Wind Generation vs Forecast
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-300">
                Explore January 2024 UK national wind generation and compare actual
                output against the latest eligible forecast available at least{" "}
                <span className="font-semibold text-white">{horizon} hours</span>{" "}
                before each target timestamp.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              <p>
                <span className="font-medium text-slate-100">Selected range:</span>{" "}
                {data ? formatUtcDateTime(data.start) : "-"} to{" "}
                {data ? formatUtcDateTime(data.end) : "-"}
              </p>
              <p className="mt-1">
                <span className="font-medium text-slate-100">Forecast horizon:</span>{" "}
                {horizon} hours
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] md:grid-cols-3 md:p-5">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Start time (UTC)</span>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">End time (UTC)</span>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"            />
          </label>

          <label className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">
                Forecast horizon
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-200">
                {horizon}h
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={48}
              step={1}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>0h</span>
              <span>24h</span>
              <span>48h</span>
            </div>
          </label>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Returned points"
            value={data ? formatNumber(data.count) : "-"}
            helper="Timestamps in selected range"
          />
          <SummaryCard
            label="Forecast coverage"
            value={data ? `${summary.coveragePct.toFixed(1)}%` : "-"}
            helper={`${formatNumber(summary.validForecastCount)} points with forecast data`}
          />
          <SummaryCard
            label="Mean absolute error"
            value={`${formatNumber(summary.meanAbsError)} MW`}
            helper="Average absolute forecast error"
          />
          <SummaryCard
            label="Mean error"
            value={`${formatNumber(summary.meanError)} MW`}
            helper="Positive means forecast exceeds actual"
          />
          <SummaryCard
            label="Max absolute error"
            value={`${formatNumber(summary.maxAbsError)} MW`}
            helper="Largest absolute deviation in range"
          />
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Actual vs forecast time series
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Forecast points are derived from the latest forecast published at
                least {horizon} hours before each target time. Missing timestamps are
                absent in the underlying data; connected display is used here for visual
                readability.
              </p>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-400">
              Loading monitoring data...
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-4 text-sm text-red-300">
              <span className="font-medium">Unable to load data:</span> {error}
            </div>
          )}

          {!loading && !error && data && data.items.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-400">
              No data available for the selected range.
            </div>
          )}

          {!loading && !error && data && data.items.length > 0 && (
            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="label"
                    minTickGap={32}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={{ stroke: "#475569" }}
                    tickLine={{ stroke: "#475569" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    axisLine={{ stroke: "#475569" }}
                    tickLine={{ stroke: "#475569" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      color: "#e2e8f0",
                    }}
                    formatter={(value: number | null, name: string) => [
                      value === null ? "-" : `${formatNumber(value)} MW`,
                      name,
                    ]}
                    labelFormatter={(label) => `Time: ${label} UTC`}
                  />
                  <Legend
                    wrapperStyle={{
                      color: "#cbd5e1",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actualGeneration"
                    name="Actual generation"
                    dot={false}
                    stroke="#60a5fa"
                    strokeWidth={2}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecastGeneration"
                    name="Forecast generation"
                    dot={{ r: 2 }}
                    stroke="#22c55e"
                    strokeWidth={3}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] md:p-5">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-slate-100">Sample rows</h2>
            <p className="text-sm text-slate-400">
              Preview of returned records for the selected filters.
            </p>
          </div>

          {data && (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-950/80">
                  <tr className="text-left text-slate-400">
                    <th className="px-3 py-3 font-medium">Start time</th>
                    <th className="px-3 py-3 font-medium">Actual (MW)</th>
                    <th className="px-3 py-3 font-medium">Forecast (MW)</th>
                    <th className="px-3 py-3 font-medium">Publish time</th>
                    <th className="px-3 py-3 font-medium">Effective horizon</th>
                    <th className="px-3 py-3 font-medium">Abs error (MW)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.slice(0, 12).map((item, index) => (
                    <tr
                      key={`${item.startTime}-${index}`}
                      className="border-t border-slate-800 align-top text-slate-200"
                    >
                      <td className="px-3 py-3 whitespace-nowrap text-slate-300">
                        {formatUtcDateTime(item.startTime)}
                      </td>
                      <td className="px-3 py-3">{formatNumber(item.actualGeneration)}</td>
                      <td className="px-3 py-3">{formatNumber(item.forecastGeneration)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-300">
                        {formatUtcDateTime(item.publishTime)}
                      </td>
                      <td className="px-3 py-3">
                        {item.effectiveHorizonHours !== null
                          ? `${item.effectiveHorizonHours.toFixed(1)}h`
                          : "-"}
                      </td>
                      <td className="px-3 py-3">{formatNumber(item.absErrorMW)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}