"use client";
import { useState } from "react";
import Stats from "./Stats";
import Investments from "./Investments";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("stats");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="p-6">
          <div className="inline-flex items-center bg-white rounded-xl p-1.5 gap-1 shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTab("stats")}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${
                  activeTab === "stats"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }
              `}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Stats
            </button>
            <button
              onClick={() => setActiveTab("investments")}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${
                  activeTab === "investments"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }
              `}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Investments
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300 ease-in-out">
          {activeTab === "stats" && <Stats />}
          {activeTab === "investments" && <Investments />}
        </div>
      </div>
    </div>
  );
}
