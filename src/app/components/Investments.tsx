"use client";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Investment {
  id: number;
  symbol: string;
  name: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  color: string;
  icon: string;
  profit?: number;
  profitPercent?: string;
}

export default function Investments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchInvestments();
    const interval = setInterval(fetchInvestments, 10000); // auto refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchInvestments = async (): Promise<void> => {
    try {
      setIsRefreshing(true);
      const response = await fetch("/api/binance/open-trades");
      const data = await response.json();
      setInvestments(data);
    } catch (error) {
      console.error("Failed to fetch investments:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const calculateStats = (investment: Investment) => {
    const invested = investment.amount * investment.avgBuyPrice;
    const currentValue = investment.amount * investment.currentPrice;
    const profit = currentValue - invested;
    const profitPercent = ((profit / invested) * 100).toFixed(2);
    return { invested, currentValue, profit, profitPercent };
  };

  if (investments.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No open positions found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {investments.map((investment) => {
          const stats = calculateStats(investment);
          const isProfit = stats.profit >= 0;

          return (
            <div
              key={investment.id}
              className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {investment.symbol}
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {investment.name}
                    </p>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded text-xs font-medium ${
                      isProfit
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {isProfit ? "+" : ""}
                    {stats.profitPercent}%
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">
                      Current Value
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                      $
                      {(investment.amount * investment.currentPrice).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">
                        Holdings
                      </div>
                      <div className="text-sm font-medium text-slate-900">
                        {investment.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1 text-right">
                        Avg Price
                      </div>
                      <div className="text-sm font-medium text-slate-900 text-right">
                        ${investment.avgBuyPrice.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1 text-right">
                        Current Price
                      </div>
                      <div className="text-sm font-medium text-slate-900 text-right">
                        ${investment.currentPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Profit/Loss
                      </span>
                      <div
                        className={`flex items-center gap-1.5 font-semibold ${
                          isProfit ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isProfit ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        <span className="text-sm">
                          {isProfit ? "+" : ""}$
                          {Math.abs(stats.profit).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}