import React from 'react';
import { Info } from 'lucide-react';

interface SoilAnalysisPanelProps {
  data: {
    clay: number;
    sand: number;
    silt: number;
    texture_class: string;
    drainage: string;
    water_retention: string;
    nutrient_retention: string;
    workability: string;
    description: string;
  };
}

export default function SoilAnalysisPanel({ data }: SoilAnalysisPanelProps) {
  // Calculate pie chart segments
  const total = data.clay + data.sand + data.silt;
  const clayPercent = (data.clay / total) * 100;
  const sandPercent = (data.sand / total) * 100;
  const siltPercent = (data.silt / total) * 100;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="font-bold text-lg text-slate-900 mb-4">Soil Composition</h3>
      
      {/* Pie Chart using conic-gradient */}
      <div className="flex justify-center mb-6">
        <div className="relative w-40 h-40">
          <div 
            className="w-full h-full rounded-full"
            style={{
              background: `conic-gradient(
                from 0deg,
                #92400e 0deg ${clayPercent * 3.6}deg,
                #f59e0b ${clayPercent * 3.6}deg ${(clayPercent + sandPercent) * 3.6}deg,
                #10b981 ${(clayPercent + sandPercent) * 3.6}deg 360deg
              )`
            }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-xs text-slate-500 font-medium">Texture</div>
                <div className="text-sm font-bold text-slate-900">{data.texture_class}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-900"></div>
            <span className="text-sm text-slate-600">Clay</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">{data.clay.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-sm text-slate-600">Sand</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">{data.sand.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-slate-600">Silt</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">{data.silt.toFixed(1)}%</span>
        </div>
      </div>

      {/* Soil Properties Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Drainage</div>
          <div className="text-sm font-semibold text-slate-900">{data.drainage}</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Water Retention</div>
          <div className="text-sm font-semibold text-slate-900">{data.water_retention}</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Nutrient Retention</div>
          <div className="text-sm font-semibold text-slate-900">{data.nutrient_retention}</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Workability</div>
          <div className="text-sm font-semibold text-slate-900">{data.workability}</div>
        </div>
      </div>

      {/* Note about regional defaults */}
      {data.description.includes('regional defaults') && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">{data.description}</p>
        </div>
      )}
    </div>
  );
}
