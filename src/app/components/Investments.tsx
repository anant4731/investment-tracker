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
}

interface InvestmentStats {
  invested: number;
  currentValue: number;
  profit: number;
  profitPercent: string;
}

export default function Investments() {
  const [investments, setInvestments] = useState<Investment[]>([
    {
      id: 1,
      symbol: "BTC",
      name: "Bitcoin",
      amount: 0.5,
      avgBuyPrice: 45000,
      currentPrice: 67000,
      color: "from-orange-500 to-yellow-600",
      icon: "₿",
    },
    {
      id: 2,
      symbol: "SOL",
      name: "Solana",
      amount: 150,
      avgBuyPrice: 85,
      currentPrice: 142,
      color: "from-purple-500 to-pink-600",
      icon: "◎",
    },
    {
      id: 3,
      symbol: "USDT",
      name: "Tether",
      amount: 5000,
      avgBuyPrice: 1,
      currentPrice: 1,
      color: "from-green-500 to-emerald-600",
      icon: "₮",
    },
  ]);

  // Fetch investments on mount and refresh every 10 seconds
  useEffect(() => {
    // fetchInvestments();
    // const interval = setInterval(() => {
    //   fetchInvestments();
    // }, 10000);
    // return () => clearInterval(interval);
  }, []);

  // const fetchInvestments = async (): Promise<void> => {
  //   try {
  //     setIsRefreshing(true);
  //     const response = await fetch('/api/investments');
  //     const data: Investment[] = await response.json();
  //     setInvestments(data);
  //   } catch (error) {
  //     console.error('Failed to fetch investments:', error);
  //   } finally {
  //     setIsRefreshing(false);
  //   }
  // };

  const calculateStats = (investment: Investment): InvestmentStats => {
    const invested = investment.amount * investment.avgBuyPrice;
    const currentValue = investment.amount * investment.currentPrice;
    const profit = currentValue - invested;
    const profitPercent = ((profit / invested) * 100).toFixed(2);
    return { invested, currentValue, profit, profitPercent };
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {investments.map((investment) => {
          const stats = calculateStats(investment);
          const isProfit = stats.profit >= 0;

          return (
            <div
              key={investment.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer group"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-14 h-14 bg-gradient-to-br ${investment.color} rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-md group-hover:scale-110 transition-transform duration-300`}
                  >
                    {investment.icon}
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isProfit
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {isProfit ? "+" : ""}
                    {stats.profitPercent}%
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {investment.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-slate-600 font-medium">
                      {investment.symbol}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-sm text-slate-600">
                      {investment.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                {/* Current Value */}
                <div>
                  <div className="text-xs text-slate-500 font-medium mb-1">
                    Current Value
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    $
                    {stats.currentValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>

                {/* Price Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 font-medium mb-1">
                      Avg Buy
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      $
                      {investment.avgBuyPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium mb-1">
                      Current
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      $
                      {investment.currentPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>

                {/* Profit/Loss */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Profit/Loss
                    </span>
                    <div
                      className={`flex items-center gap-1 font-bold ${
                        isProfit ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isProfit ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>
                        {isProfit ? "+" : ""}$
                        {Math.abs(stats.profit).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${
                        isProfit
                          ? "from-green-500 to-emerald-600"
                          : "from-red-500 to-red-600"
                      } transition-all duration-500`}
                      style={{
                        width: `${Math.min(
                          Math.abs(parseFloat(stats.profitPercent)),
                          100
                        )}%`,
                      }}
                    />
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
