"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);
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
        throw new Error(`Request failed with status ${response.status}`);
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
      };
    }

    const validForecasts = data.items.filter((item) => item.forecastGeneration !== null);
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

    return { coveragePct, meanAbsError, meanError, maxAbsError };
  }, [data]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Forecast Monitoring App</h1>
          <p className="text-sm text-slate-600">
            UK national wind generation, January 2024. The forecast line shows the latest
            forecast published at least {horizon} hours before each target time.
          </p>
        </section>

        <section className="grid gap-4 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-medium">Start time (UTC)</span>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">End time (UTC)</span>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Forecast horizon: {horizon}h</span>
            <input
              type="range"
              min={0}
              max={48}
              step={1}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Returned points</p>
            <p className="mt-2 text-2xl font-semibold">{data?.count ?? "-"}</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Forecast coverage</p>
            <p className="mt-2 text-2xl font-semibold">
              {data ? `${summary.coveragePct.toFixed(1)}%` : "-"}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Mean absolute error</p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(summary.meanAbsError)} MW</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Mean error</p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(summary.meanError)} MW</p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Actual vs forecast</h2>
              <p className="text-sm text-slate-500">
                Missing forecast points are intentionally left blank.
              </p>
            </div>

            <button
              onClick={loadData}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Refresh
            </button>
          </div>

          {loading && <p className="text-sm">Loading data...</p>}
          {error && <p className="text-sm text-red-600">Error: {error}</p>}

          {!loading && !error && data && (
            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    minTickGap={32}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number | null, name: string) => [
                        value === null ? "-" : `${formatNumber(value)} MW`,
                        name,
                      ]}
                      labelFormatter={(label) => `Time: ${label} UTC`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="actualGeneration"
                    name="Actual generation"
                    dot={false}
                    stroke="#2563eb"
                    strokeWidth={2}
                    connectNulls={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="forecastGeneration"
                    name="Forecast generation"
                    dot={{ r: 2 }}
                    stroke="#16a34a"
                    strokeWidth={3}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Sample rows</h2>

          {data && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-3 py-2">startTime</th>
                    <th className="px-3 py-2">actual</th>
                    <th className="px-3 py-2">forecast</th>
                    <th className="px-3 py-2">publishTime</th>
                    <th className="px-3 py-2">effective horizon</th>
                    <th className="px-3 py-2">abs error</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.slice(0, 12).map((item, index) => (
                    <tr key={`${item.startTime}-${index}`} className="border-b border-slate-100">
                      <td className="px-3 py-2">{item.startTime ?? "-"}</td>
                      <td className="px-3 py-2">{item.actualGeneration ?? "-"}</td>
                      <td className="px-3 py-2">{item.forecastGeneration ?? "-"}</td>
                      <td className="px-3 py-2">{item.publishTime ?? "-"}</td>
                      <td className="px-3 py-2">
                        {item.effectiveHorizonHours ?? "-"}
                      </td>
                      <td className="px-3 py-2">{item.absErrorMW ?? "-"}</td>
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