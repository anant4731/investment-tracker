"use client";
import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

type TimeFrame = "7d" | "1m" | "3m" | "6m" | "1y" | "all";

interface DataItem {
  date: string;
  avgFundingRate: number; // funding rate as a decimal (e.g. 0.0001)
}

/**
 * The shape of the payload items Recharts passes into custom tooltip content.
 * Keep it narrow and typed so we don't use `any` or rely on deep library types.
 */
interface TooltipPayloadItem {
  value?: number | string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number | undefined;
}

export default function FundingRate(): React.ReactElement {
  const [data, setData] = useState<DataItem[]>([]);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>("1y");
  const [isLoading, setIsLoading] = useState(false);

  const timeFrameOptions: { value: TimeFrame; label: string }[] = [
    { value: "7d", label: "7D" },
    { value: "1m", label: "1M" },
    { value: "3m", label: "3M" },
    { value: "6m", label: "6M" },
    { value: "1y", label: "1Y" },
    { value: "all", label: "All" },
  ];

  useEffect(() => {
    fetchData(selectedTimeFrame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeFrame]);

  const fetchData = async (timeFrame: TimeFrame) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/binance/indicators/funding-rate?timeframe=${timeFrame}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: DataItem[] = await res.json();
      // Optionally validate shape here before setData
      setData(json);
    } catch (error) {
      // keep error typed without using `any`
      // eslint-disable-next-line no-console
      console.error("Failed to fetch funding rate data:", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Local, well-typed tooltip component — returns React element or null.
  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length > 0) {
      const raw = payload[0].value;
      const asNumber = typeof raw === "number" ? raw : Number(raw);
      const validNumber = Number.isFinite(asNumber) ? asNumber : 0;
      const percentage = validNumber * 100;
      const isPositive = percentage >= 0;

      return (
        <div className="bg-white px-3 py-2 border border-slate-200 rounded-lg shadow-lg">
          <p className="text-xs text-slate-600 mb-1">{label}</p>
          <p className={`text-sm font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
            {isPositive ? "+" : ""}
            {percentage.toFixed(4)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">BTC Funding Rate</h2>
            <p className="text-sm text-slate-500 mt-1">Daily Average Funding Rate</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {timeFrameOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedTimeFrame(option.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  selectedTimeFrame === option.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-sm text-slate-500">Loading...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                tickFormatter={(v: number) => `${(v * 100).toFixed(3)}%`}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                width={60}
              />
              {/* Pass the React element as content — Recharts accepts element or function */}
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="0" />
              <Line
                type="monotone"
                dataKey="avgFundingRate"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#3b82f6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
