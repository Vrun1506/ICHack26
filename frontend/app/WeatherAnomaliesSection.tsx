import React from 'react';
import { TrendingUp, TrendingDown, Minus, ThermometerSun, Wind, Droplets, Cloud } from 'lucide-react';
import { cn } from './utils';

interface WeatherAnomaliesSectionProps {
  data: {
    soil_temp_delta: number;
    soil_temp_actual: number;
    soil_temp_predicted: number;
    wind_speed_delta: number;
    wind_speed_actual: number;
    precipitation_prob_actual: number;
    precipitation_actual: number;
    cloud_cover_actual: number;
    overall_risk: string;
  };
}

export default function WeatherAnomaliesSection({ data }: WeatherAnomaliesSectionProps) {
  const anomalies = [
    {
      icon: ThermometerSun,
      label: "Soil Temperature",
      actual: `${data.soil_temp_actual}°C`,
      predicted: `${data.soil_temp_predicted}°C`,
      delta: data.soil_temp_delta,
      unit: "°C"
    },
    {
      icon: Wind,
      label: "Wind Speed",
      actual: `${data.wind_speed_actual} km/h`,
      predicted: `${(data.wind_speed_actual - data.wind_speed_delta).toFixed(1)} km/h`,
      delta: data.wind_speed_delta,
      unit: "km/h"
    },
    {
      icon: Droplets,
      label: "Precipitation",
      actual: `${data.precipitation_actual} mm`,
      predicted: `${data.precipitation_prob_actual}% chance`,
      delta: 0, // No delta provided in API for precipitation
      unit: "mm"
    },
    {
      icon: Cloud,
      label: "Cloud Cover",
      actual: `${data.cloud_cover_actual}%`,
      predicted: "N/A",
      delta: 0,
      unit: "%"
    }
  ];

  const getDeltaIcon = (delta: number) => {
    if (delta > 0.5) return TrendingUp;
    if (delta < -0.5) return TrendingDown;
    return Minus;
  };

  const getDeltaColor = (delta: number) => {
    if (Math.abs(delta) < 0.5) return "text-slate-500";
    if (delta > 0) return "text-red-600";
    return "text-blue-600";
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk.toUpperCase()) {
      case 'STABLE':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-lg text-slate-900">Weather Anomalies</h3>
          <p className="text-sm text-slate-500">Actual vs. predicted conditions</p>
        </div>
        <div className={cn(
          "px-4 py-2 rounded-lg border text-sm font-bold uppercase tracking-wider",
          getRiskBadgeColor(data.overall_risk)
        )}>
          {data.overall_risk}
        </div>
      </div>

      {/* Anomalies Table */}
      <div className="space-y-3">
        {anomalies.map((anomaly, index) => {
          const Icon = anomaly.icon;
          const DeltaIcon = getDeltaIcon(anomaly.delta);
          const deltaColor = getDeltaColor(anomaly.delta);

          return (
            <div 
              key={index}
              className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>

                {/* Label */}
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{anomaly.label}</div>
                  <div className="text-xs text-slate-500">Real-time measurement</div>
                </div>

                {/* Values */}
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">{anomaly.actual}</div>
                  <div className="text-xs text-slate-500">Predicted: {anomaly.predicted}</div>
                </div>

                {/* Delta Indicator */}
                {Math.abs(anomaly.delta) > 0.01 && (
                  <div className={cn("flex items-center gap-1", deltaColor)}>
                    <DeltaIcon className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {anomaly.delta > 0 ? '+' : ''}{anomaly.delta.toFixed(1)}{anomaly.unit}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-lg border border-indigo-100">
        <p className="text-sm text-indigo-900">
          <span className="font-semibold">Analysis:</span> Current weather conditions show {
            data.overall_risk === 'STABLE' 
              ? 'stable patterns with minimal deviation from predictions.' 
              : 'some anomalies compared to forecast models. Monitor closely.'
          }
        </p>
      </div>
    </div>
  );
}
