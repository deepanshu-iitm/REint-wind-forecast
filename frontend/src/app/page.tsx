"use client";

import { useEffect, useMemo, useState } from "react";

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

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Wind Forecast Monitoring</h1>
          <p className="text-sm text-slate-600">
            January 2024 UK wind generation — actuals vs latest eligible forecast.
          </p>
        </div>

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

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">API status</h2>
            <button
              onClick={loadData}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Backend URL:</span> {API_BASE_URL}
            </p>
            <p className="break-all">
              <span className="font-medium">Request:</span> {apiUrl}
            </p>
            {loading && <p>Loading data...</p>}
            {error && <p className="text-red-600">Error: {error}</p>}
            {data && !loading && (
              <div className="space-y-1">
                <p>
                  <span className="font-medium">Returned rows:</span> {data.count}
                </p>
                <p>
                  <span className="font-medium">Response horizon:</span> {data.horizon}h
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Sample rows</h2>

          {!data && !loading && !error && (
            <p className="text-sm text-slate-600">No data loaded yet.</p>
          )}

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