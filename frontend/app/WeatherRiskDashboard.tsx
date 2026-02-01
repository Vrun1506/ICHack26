import React from 'react';
import { CloudLightning, Sun } from 'lucide-react';

interface WeatherRiskDashboardProps {
  extremeWeather: {
    likelihood: string;
    risk_level: string;
    region: string;
    temperature_z_score: number;
  };
  weatherAnomalies: {
    overall_risk: string;
  };
  currentCrop: {
    weatherScore: number;
    priceScore: number;
  };
  soilTexture?: string; // Optional prop for soil texture
}

export default function WeatherRiskDashboard({ 
  extremeWeather, 
  weatherAnomalies,
  currentCrop,
  soilTexture
}: WeatherRiskDashboardProps) {
  // Convert likelihood percentage to numeric value
  const likelihoodValue = parseFloat(extremeWeather.likelihood.replace('%', ''));
  
  return (
    <div className="space-y-4">
      {/* Header with Soil Texture */}
      {soilTexture && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Weather Risk Dashboard</h2>
          <div className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            Soil Texture: <span className="font-medium text-slate-800">{soilTexture}</span>
          </div>
        </div>
      )}
      
      {/* Extreme Weather Risk Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-100 rounded-lg">
            <CloudLightning className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Extreme Weather Risk</div>
            <div className="text-xl font-bold text-red-700">{likelihoodValue.toFixed(0)}/100</div>
          </div>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
          <div 
            className="h-full bg-red-500 rounded-full transition-all duration-500" 
            style={{ width: `${likelihoodValue}%` }}
          ></div>
        </div>
        <div className="mt-3 text-xs text-slate-600">
          Status: <span className="font-semibold text-red-600">{extremeWeather.risk_level}</span>
        </div>
      </div>

      {/* Weather Suitability Score */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Sun className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Weather Suitability</div>
            <div className="text-xl font-bold text-emerald-700">{currentCrop.weatherScore}/100</div>
          </div>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
            style={{ width: `${currentCrop.weatherScore}%` }}
          ></div>
        </div>
        <div className="mt-3 text-xs text-slate-600">
          Overall anomaly risk: <span className="font-semibold text-emerald-600">{weatherAnomalies.overall_risk}</span>
        </div>
      </div>
    </div>
  );
}