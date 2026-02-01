import React from 'react';
import { cn } from './utils';

interface CropData {
  name: string;
  priceData: number[];
}

interface ProfitabilityCardProps {
  currentCrop: CropData;
  selectedCrop: number;
}

export default function ProfitabilityCard({ currentCrop, selectedCrop }: ProfitabilityCardProps) {
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 p-8 rounded-xl border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-800 mb-1">Profitability</h2>
        <p className="text-sm text-slate-500">6-month forecast & trends</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="flex flex-row gap-2">
          <div className="w-full bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Expected Price</div>
            <div className="text-2xl font-bold text-emerald-600">£{Math.round(currentCrop.priceData[currentCrop.priceData.length - 1] * 1.15)}</div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="h-100px bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Monthly Price Trends</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-xs text-slate-600">Price History</span>
            </div>
          </div>
        </div>

        <div className="relative h-56 w-full pt-4">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-4 bottom-8 w-12 flex flex-col justify-between text-xs text-slate-400">
            <span>£{Math.max(...currentCrop.priceData)}</span>
            <span>£{Math.round(Math.max(...currentCrop.priceData) * 0.5)}</span>
            <span>£0</span>
          </div>

          {/* Chart area */}
          <div className="ml-12 h-full pb-8">
            {/* Grid lines */}
            <div className="absolute left-12 right-0 top-4 bottom-8 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="w-full border-t border-slate-100"></div>
              ))}
            </div>

            {/* Bars */}
            <div className="flex items-end gap-3 relative" style={{ height: 'calc(100% - 1rem)' }}>
              {currentCrop.priceData.map((price, i) => {
                const maxPrice = Math.max(...currentCrop.priceData);
                const heightPercent = (price / maxPrice) * 100;
                const isHighest = price === maxPrice;
                
                return (
                  <div key={`price-${selectedCrop}-${i}`} className="flex-1 flex flex-col justify-end group">
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-300 relative ${
                        isHighest 
                          ? 'bg-gradient-to-t from-indigo-500 to-indigo-400 shadow-lg' 
                          : 'bg-gradient-to-t from-indigo-300 to-indigo-200 group-hover:from-indigo-500 group-hover:to-indigo-400'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-10">
                        <div className="font-semibold">£{price}</div>
                        <div className="text-slate-300 text-[10px]">Month {i + 1}</div>
                        {/* Arrow */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                      </div>

                      {/* Value on top of bar */}
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        £{price}
                      </div>
                    </div>
                    
                    {/* Month label */}
                    <div className="text-center text-xs font-medium text-slate-500 mt-3">
                      M{i + 1}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Line Overlay */}
            <svg className="absolute inset-0 right-0 bottom-8 top-4 left-12 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`lineGradient-${selectedCrop}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              
              <polyline 
                fill="none" 
                stroke={`url(#lineGradient-${selectedCrop})`}
                strokeWidth="0.8" 
                strokeLinecap="round"
                strokeLinejoin="round"
                points={currentCrop.priceData.map((price, i) => {
                  const maxPrice = Math.max(...currentCrop.priceData);
                  const barWidth = 100 / currentCrop.priceData.length;
                  const x = (i * barWidth) + (barWidth / 2);
                  const y = 100 - (price / maxPrice) * 100;
                  return `${x},${y}`;
                }).join(" ")} 
              />
              
              {/* Dots on line */}
              {currentCrop.priceData.map((price, i) => {
                const maxPrice = Math.max(...currentCrop.priceData);
                const barWidth = 100 / currentCrop.priceData.length;
                const x = (i * barWidth) + (barWidth / 2);
                const y = 100 - (price / maxPrice) * 100;
                
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="1.2" fill="white" stroke="#6366f1" strokeWidth="0.6" />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Average Price:</span>
            <span className="font-semibold text-slate-700">
              £{Math.round(currentCrop.priceData.reduce((a, b) => a + b, 0) / currentCrop.priceData.length)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Trend:</span>
            <span className={cn(
              "font-semibold flex items-center gap-1",
              currentCrop.priceData[currentCrop.priceData.length - 1] > currentCrop.priceData[0] 
                ? "text-emerald-600" 
                : "text-rose-600"
            )}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={currentCrop.priceData[currentCrop.priceData.length - 1] > currentCrop.priceData[0]
                    ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    : "M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
                  }
                />
              </svg>
              {currentCrop.priceData[currentCrop.priceData.length - 1] > currentCrop.priceData[0] 
                ? "Increasing" 
                : "Decreasing"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
