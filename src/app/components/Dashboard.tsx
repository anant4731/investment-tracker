"use client";
import { useState } from "react";
import Stats from "./Stats";
import Investments from "./Investments";
import Indicators from "./Indicators";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("stats");

  // Define all tabs here — easy to extend
  const tabs = [
    {
      id: "stats",
      label: "Stats",
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
      component: <Stats />,
    },
    {
      id: "investments",
      label: "Investments",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
      component: <Investments />,
    },
    {
      id: "indicators",
      label: "Indicators",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
      ),
      component:<Indicators />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Navigation */}
        <div className="mb-6">
          {/* Desktop & Tablet: Horizontal scrollable tabs */}
          <div className="hidden sm:block overflow-x-auto scrollbar-hide">
            <div className="inline-flex items-center bg-white rounded-lg p-1.5 gap-1 shadow-lg border border-slate-200 min-w-min">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group relative flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl text-sm font-medium
                    transition-all duration-300 cursor-pointer whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }
                  `}
                >
                  <span className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {tab.icon}
                  </span>
                  <span className="hidden md:inline">{tab.label}</span>
                  
                  {/* Active indicator */}
                  {activeTab === tab.id && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-white rounded-full opacity-50" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile: Grid layout */}
          <div className="sm:hidden grid grid-cols-2 gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-sm font-medium
                  transition-all duration-300 cursor-pointer
                  ${
                    activeTab === tab.id
                      ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl scale-105"
                      : "bg-white text-slate-600 hover:text-slate-900 hover:shadow-lg border border-slate-200"
                  }
                `}
              >
                <span className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-125' : 'group-hover:scale-110'}`}>
                  {tab.icon}
                </span>
                <span className="text-xs">{tab.label}</span>
                
                {/* Active indicator dot */}
                {activeTab === tab.id && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300 ease-in-out">
          {tabs.find((t) => t.id === activeTab)?.component}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}